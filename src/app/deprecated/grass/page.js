"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Box, Paper, Stack, Divider, Button, TextField, ThemeProvider, Typography,
  FormControl, InputLabel, Select, MenuItem, OutlinedInput, InputAdornment, Input, FormHelperText, Grid2,
  List, ListItem, ListItemText, IconButton
} from "@mui/material"
import { createTheme } from "@mui/material/styles"
import { Color, Vector2d as Vector } from "../../utils"
import { Noise } from "../../noise"

const fps = 24;

export default function GrassPage() {

  let theme = createTheme({
    palette: {
    mode: "dark",
    }
  });
  theme = createTheme(theme, {
    palette: {
    blue: theme.palette.augmentColor({color: { main: "#7ac2f9", backgroundDark: "#2c3e4d" }}),
    green: theme.palette.augmentColor({color: { main: "#B4E767", backgroundDark: "#3b4826" }}),
    yellow: theme.palette.augmentColor({color: { main: "#F2DE73", backgroundDark: "#4c4529" }}),
    red: theme.palette.augmentColor({color: { main: "#EC8B8B", backgroundDark: "#4a2f2f" }}),
    white: theme.palette.augmentColor({color: { main: "#FFFFFF", backgroundDark: "#000000" }}),
    }
  });
  
  const [clientSize, setClientSize] = useState({
    width: 800, height: 600
  })
  const [points, setPoints] = useState([])
  const [renderInterval, setRenderInterval] = useState(null)
  const [windNoises, setWindNoises] = useState([])
  const [settings, setSettings] = useState({
    startTime: Date.now(),
    gridInterval: 60,
    linkElasticity: 10, // deformation (lu) * linkElasticity = acceleration (lu/second^2), where lu is gridInterval as a length unit
    rootElasticity: 3.5, // length (lu) * rootElasticity = acceleration (lu/second^2)
    
    windAngleRange: Math.PI * 2,
    windSpeedRange: 2.5, // windSpeed = acceleration (lu/second^2)
  });
  const canvasRef = useRef(null)
  const G = useRef(null)

  useEffect(() => {
    G.current = {
      clientSize,
      points,
      settings,
      canvasRef,
      windNoises,
    }
  })

  function getWinds() {
    const { windNoises, settings } = G.current;
    const time = (Date.now() - settings.startTime) / 1000 / 100;
    return windNoises.map((windNoise) => {
      let baseThetaRandom = windNoise.simplex2(0, 0);
      baseThetaRandom = baseThetaRandom * 100 - Math.floor(baseThetaRandom * 100);
      const baseTheta = baseThetaRandom * Math.PI * 2;
      const angle = baseTheta + windNoise.simplex2(time, 1) * settings.windAngleRange / 2;
      const speed = windNoise.simplex2(time, 2) * settings.windSpeedRange;
      const displacement = windNoise.simplex2(time, 3);
      return {
        angle, speed, displacement
      }
    })
  }

  function physicsTick() {
    const deltaTime = 1 / fps;
    const { points, settings, windNoises } = G.current;

    const winds = getWinds();

    // apply elastic force for every linked pair of points
    let accelerations = new Array(points.length).fill(new Vector(0, 0));
    const windMaxH = new Vector(clientSize.width, clientSize.height).length() / settings.gridInterval / 2;
    points.forEach((point) => {
      // forces from links
      point.links.forEach((linkId) => {
        const link = points[linkId];
        const baseDisplacement = link.base.sub(point.base);
        const displacement = baseDisplacement.add(link.displacement).sub(point.displacement);
        const deformation = displacement.length() - baseDisplacement.length();
        const acceleration = baseDisplacement.normalized().mul(deformation * settings.linkElasticity);
        accelerations[point.id] = accelerations[point.id].add(acceleration.mul(deltaTime));
      })
      // force from root
      {
        const displacement = point.displacement;
        const l = displacement.length();
        // let acceleration = displacement.normalized().mul(-settings.rootElasticity * l);
        let acceleration = displacement.normalized().mul(-settings.rootElasticity * l);
        accelerations[point.id] = accelerations[point.id].add(acceleration.mul(deltaTime));
      }
      // force from wind
      {
        const p = point.base.add(point.displacement);
        const phi = Math.atan2(p.y, p.x);
        const d = p.length();
        winds.forEach((wind) => {
          const gamma = phi - wind.angle;
          const h = Math.sin(gamma) * d - wind.displacement * windMaxH;
          const ratio = h / windMaxH;
          const speedRatio = Math.max(1 - ratio * ratio, 0);
          const windSpeed = wind.speed * speedRatio;
          const windDirection = new Vector(Math.cos(wind.angle), Math.sin(wind.angle));
          const acceleration = windDirection.mul(windSpeed);
          accelerations[point.id] = accelerations[point.id].add(acceleration.mul(deltaTime));
        })
      }
    })

    // update velocity with acceleration
    points.forEach((point) => {
      point.velocity = point.velocity.add(accelerations[point.id].mul(deltaTime));
      const dv = point.velocity.mul(0.01 * deltaTime);
      point.velocity = point.velocity.sub(dv);
    })

    // update displacement with velocity
    points.forEach((point) => {
      point.displacement = point.displacement.add(point.velocity.mul(deltaTime));
    })
  }
  
  function redraw() {
    if (G.current == null) return;
    const { clientSize, points, settings, canvasRef, pointColors } = G.current;
    const gridInterval = settings.gridInterval;
    // draw lines from root to point (as displacement)
    
    // create an offscreen canvas
    const offscreenCanvas = new OffscreenCanvas(clientSize.width, clientSize.height)
    const ctx = offscreenCanvas.getContext("2d")
    // clear canvas as black
    ctx.fillStyle = "black"
    ctx.fillRect(0, 0, clientSize.width, clientSize.height)

    // draw lines
    ctx.lineWidth = 10
    ctx.lineCap = "round"
    ctx.strokeStyle = "rgb(128, 224, 64)"
    const h = points.length;
    const w = points.length > 0 ? points[0].length : 1;
    const offsetX = clientSize.width / 2;
    const offsetY = clientSize.height / 2;
    const offset = new Vector(offsetX, offsetY);

    const winds = getWinds();
    const windMaxH = new Vector(clientSize.width, clientSize.height).length() / settings.gridInterval / 2;

    points.forEach((point) => {
      const p = point.base.mul(gridInterval).add(offset);
      const r = p.add(point.displacement.mul(gridInterval));
      const gradient = ctx.createLinearGradient(p.x, p.y, r.x, r.y)
      gradient.addColorStop(0, "transparent")
      gradient.addColorStop(1, point.color.toString())
      ctx.strokeStyle = gradient
      ctx.lineWidth = 10
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(r.x, r.y)
      ctx.stroke()
      // connect a 1px white line to all links
      if (true) {
        ctx.strokeStyle = "white"
        ctx.lineWidth = 1
        point.links.forEach((linkId) => {
          const link = points[linkId];
          const q = link.base.add(link.displacement).mul(gridInterval).add(offset);
          ctx.beginPath()
          ctx.moveTo(r.x, r.y)
          ctx.lineTo(q.x, q.y)
          ctx.stroke()
        })
      }
      
      if (false) {
        const p = point.base.add(point.displacement);
        const phi = Math.atan2(p.y, p.x);
        const d = p.length();
        const time = (Date.now() - settings.startTime) / 1000;
        winds.forEach((wind) => {
          const gamma = phi - wind.angle;
          const h = Math.sin(gamma) * d - wind.displacement * windMaxH;
          const ratio = h / windMaxH;
          const speedRatio = Math.max(1 - ratio * ratio, 0);
          const windSpeed = wind.speed * speedRatio;
          const windDirection = new Vector(Math.cos(wind.angle), Math.sin(wind.angle));
          const acceleration = windDirection.mul(windSpeed);
          // draw acceleration
          const pr = p.mul(gridInterval).add(offset);
          const q = pr.add(acceleration.mul(gridInterval * 4));
          const gradient = ctx.createLinearGradient(pr.x, pr.y, q.x, q.y)
          const color = Color.fromHSV(120 - speedRatio * 120, 1, 1);
          let color2 = color.clone(); color2.a = 0.5;
          gradient.addColorStop(0, color2.toString())
          gradient.addColorStop(1, color.toString())
          ctx.strokeStyle = gradient
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(pr.x, pr.y)
          ctx.lineTo(q.x, q.y)
          ctx.stroke()
        })
      }

    })

    // draw winds
    if (false) {
      winds.forEach((wind) => {
        const windDirection = new Vector(Math.cos(wind.angle), Math.sin(wind.angle));
        const windNormal = windDirection.rotate(Math.PI / 2);
        const displaced = windNormal.mul(wind.displacement * gridInterval * windMaxH);
        const p = new Vector(clientSize.width / 2, clientSize.height / 2).add(displaced);
        const q = p.add(windDirection.mul(wind.speed * settings.gridInterval * 2));
        const gradient = ctx.createLinearGradient(p.x, p.y, q.x, q.y)
        gradient.addColorStop(0, "rgba(128, 128, 255, 0.5)")
        gradient.addColorStop(1, "rgb(128, 128, 255)")
        ctx.strokeStyle = gradient
        ctx.lineWidth = 20
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(q.x, q.y)
        ctx.stroke()
      })
    }

    // draw offscreen canvas to onscreen canvas
    const canvas = canvasRef.current
    const canvasCtx = canvas.getContext("2d")
    canvasCtx.clearRect(0, 0, clientSize.width, clientSize.height)
    canvasCtx.drawImage(offscreenCanvas, 0, 0)

  }

  function recreatePoints(clientSize, settings) {

    const time = Date.now();
    const gridInterval = settings.gridInterval;
    
    let noiseX = new Noise(time);
    let noiseY = new Noise(time + 1);
    let noiseHue = new Noise(time + 2);
    let noiseSat = new Noise(time + 3);

    const w = Math.ceil(clientSize.width / 2 / gridInterval) * 2 + 3;
    const h = Math.ceil(clientSize.height / 2 / gridInterval) * 2 + 3;
    // create a point grid of size h * w
    const points = []
    const basicHue = Math.random() * 360;
    const basicSat = 0.5;
    const rangeSat = 0.2;
    let iteratorIdMap = {};
    function padd(i, j, id) {
      iteratorIdMap[[i, j].toString()] = id;
    }
    function pfind(i, j) {
      return iteratorIdMap[[i, j].toString()];
    }
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        const id = points.length;
        points.push({
          base: new Vector(j - (w - 1) / 2, i - (h - 1) / 2),
          displacement: new Vector(noiseX.simplex2(i / 20, j / 20) * 2, noiseY.simplex2(i / 20, j / 20) * 2),
          color: Color.fromHSV(
            basicHue + noiseHue.simplex2(i / 10, j / 10) * 30, 
            basicSat + rangeSat * noiseSat.simplex2(i / 10, j / 20),
            1
          ),
          id: id,
          links: [],
          velocity: new Vector(0, 0),
        })
        padd(i, j, id);
      }
    }
    
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        if (i > 0) { points[pfind(i, j)].links.push(pfind(i - 1, j)); }
        if (i < h - 1) { points[pfind(i, j)].links.push(pfind(i + 1, j)); }
        if (j > 0) { points[pfind(i, j)].links.push(pfind(i, j - 1)); }
        if (j < w - 1) { points[pfind(i, j)].links.push(pfind(i, j + 1)); }
      }
    }

    setPoints(points)
  }
  
  useEffect(() => {
    const u = () => {
      if (G.current == null) return;
      const newClientSize = {
        width: window.innerWidth,
        height: window.innerHeight
      }
      setClientSize(newClientSize)
      recreatePoints(newClientSize, G.current.settings)
    }
    window.addEventListener("resize", u)
    u();
    // prevent context menu for right click for canvas
    // window.addEventListener("contextmenu", (e) => {
    //   e.preventDefault();
    // })
    // window.addEventListener("keydown", userKeyDown);
    // window.addEventListener("keypress", userKeyPress);
    
    if (renderInterval != null) {
      clearInterval(renderInterval);
    }
    const newRenderInterval = setInterval(() => {
      physicsTick();
      redraw();
    }, 1000 / fps);
    setRenderInterval(newRenderInterval);

    const time = Date.now();
    {
      let w = [];
      for (let i = 0; i < 4; i++) {
        w.push(new Noise(time + 16384 + i));
      }
      setWindNoises(w);
    }

  }, [])

  return <>
    <ThemeProvider theme={theme}> 
    <Box sx={{
      width: "100%",
      height: "100vh",
      backgroundColor: "darkgray",
      display: "flex",
    }}>
      <Box sx={{
        position: "absolute"
      }} padding={1}>
        <Stack direction="column" spacing={1}>
        </Stack>
      </Box>
      <canvas width={clientSize.width} height={clientSize.height} ref={canvasRef} 
        // onMouseDown={canvasMouseDown}
        // onMouseMove={canvasMouseMove}
        // onMouseUp={canvasMouseUp}
        // onWheel={canvasMouseWheel}
      />
    </Box>
  </ThemeProvider>
  </>

}