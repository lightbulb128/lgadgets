"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Box, Paper, Stack, Divider, Button, TextField, ThemeProvider, Typography,
  Grid2, Backdrop, Container
} from "@mui/material"
import { createTheme } from "@mui/material/styles"
import { Color, Vector2d as Vector } from "../utils"
import { Noise } from "../noise"

const fps = 24;

function keyIs(e, char) {
  return e.key == char || e.key == char.toUpperCase();
}

function GridItem({ children, size, monospace, ...props }) {
  return <Grid2 size={size} {...props}>
    <Typography variant="body1"
      sx={{
        fontFamily: monospace ? "monospace" : "inherit",
        whiteSpace: "nowrap"
      }}
    >{children}</Typography>
  </Grid2>
}

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
  const [globalNoises, setGlobalNoises] = useState({})
  const [showHelp, setShowHelp] = useState(false)
  const [settings, rawSetSettings] = useState({
    startTime: 0,
    gridInterval: 40,                                          // q w
    lineWidth: 20,                                             // e r
    displacementRatio: 3,                                      // t y
    basicSaturation: 0.5,                                      // u i
    rangeSaturation: 0.4,                                      // o p
    coordinateNoiseDensity: 0.05,                              // a s
    hueNoiseDensity: 0.1,                                      // d f
    saturationNoiseDensity: 0.1,                               // g h
    timeScale: 30,                                             // l ;
    hueRange: 30,                                              // j k
    drawHeadType: "always", // "always", "never", "tooshort"   // x
    gridType: "square", // "square", "triangle", "hexagon", "random" // c
    gridRotation: 0,                                           // n m
    // other commands
    // z: reinitialize points
    // v: clear cookies and refresh
  });
  function setSettings(newSettings) {
    // record into cookies
    const newSettingsStr = JSON.stringify(newSettings);
    document.cookie = `grass_settings=${newSettingsStr};expires=Fri, 31 Dec 9999 23:59:59 GMT`;
    rawSetSettings(newSettings)
  }
  const canvasRef = useRef(null)
  const G = useRef(null)

  useEffect(() => {
    G.current = {
      clientSize,
      points,
      settings,
      canvasRef,
      globalNoises,
      showHelp
    }
  })
  
  function redraw() {
    if (G.current == null) return;
    const { clientSize, points, settings, canvasRef, globalNoises } = G.current;
    const gridInterval = settings.gridInterval;
    const time = (Date.now() - settings.startTime) / 1000 / settings.timeScale;
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
    const offsetX = clientSize.width / 2;
    const offsetY = clientSize.height / 2;
    const offset = new Vector(offsetX, offsetY);
    
    const basicHue = (settings.startTime - Math.floor(settings.startTime)) * 360;
    const basicSat = settings.basicSaturation;
    const rangeSat = settings.rangeSaturation;
    const {
      coordinateNoiseDensity, hueNoiseDensity, saturationNoiseDensity, hueRange
    } = settings;

    const sets = points.map((point) => {
      const nx = point.base.x;
      const ny = point.base.y;
      const nz = time;
      const displacement = new Vector(
        globalNoises.x.simplex3(nx * coordinateNoiseDensity, ny * coordinateNoiseDensity, nz), 
        globalNoises.y.simplex3(nx * coordinateNoiseDensity, ny * coordinateNoiseDensity, nz)
      ).mul(settings.displacementRatio);
      const color = Color.fromHSV(
        basicHue + globalNoises.hue.simplex3(nx * hueNoiseDensity, ny * hueNoiseDensity, nz) * hueRange,
        basicSat + rangeSat * globalNoises.sat.simplex3(nx * saturationNoiseDensity, ny * saturationNoiseDensity, nz) / 2,
        1
      );

      const p = point.base.mul(gridInterval).add(offset);
      const r = p.add(displacement.mul(gridInterval));
      return {
        p, r, color
      }
    })

    sets.forEach((set) => {
      const { p, r, color } = set;
      const gradient = ctx.createLinearGradient(p.x, p.y, r.x, r.y)
      gradient.addColorStop(0, "transparent")
      gradient.addColorStop(1, color.toString())
      ctx.strokeStyle = gradient
      ctx.lineWidth = settings.lineWidth
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(r.x, r.y)
      ctx.stroke()
    })

    if (settings.drawHeadType !== "never") {
      sets.forEach((set) => {
        const { p, r, color } = set;
        if (settings.drawHeadType === "always" || p.sub(r).length() < settings.lineWidth * 2) {
          // draw a circle
          ctx.fillStyle = color.toString()
          ctx.beginPath()
          ctx.arc(r.x, r.y, settings.lineWidth / 2, 0, Math.PI * 2) 
          ctx.fill()
        }
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
    setGlobalNoises({
      x: noiseX,
      y: noiseY,
      hue: noiseHue,
      sat: noiseSat,
    })

    let da = new Vector(1, 0);
    let db = settings.gridType === "square" ? new Vector(0, 1) : new Vector(1 / 2, Math.sqrt(3) / 2);
    db = db.rotate(settings.gridRotation);
    da = da.rotate(settings.gridRotation);

    const points = []
    if (settings.gridType !== "random") {
      function expandB(p, d, k) {
        let max = Number.POSITIVE_INFINITY;
        let min = Number.NEGATIVE_INFINITY;
        if (d.x !== 0) {
          const lim1 = (clientSize.width / 2 / gridInterval + 4 - p.x) / d.x;
          const lim2 = (-clientSize.width / 2 / gridInterval - 4 - p.x) / d.x;
          if (d.x > 0) {
            max = Math.min(max, Math.floor(lim1)); 
            min = Math.max(min, Math.ceil(lim2));
          } else {
            max = Math.min(max, Math.floor(lim2));
            min = Math.max(min, Math.ceil(lim1));
          }
        } else {
          if (p.x > clientSize.width / 2 / gridInterval + 4 || p.x < -clientSize.width / 2 / gridInterval - 4) return false;
        }
        if (d.y !== 0) {
          const lim1 = (clientSize.height / 2 / gridInterval + 4 - p.y) / d.y;
          const lim2 = (-clientSize.height / 2 / gridInterval - 4 - p.y) / d.y;
          if (d.y > 0) {
            max = Math.min(max, Math.floor(lim1)); 
            min = Math.max(min, Math.ceil(lim2));
          } else {
            max = Math.min(max, Math.floor(lim2));
            min = Math.max(min, Math.ceil(lim1));
          }
        } else {
          if (p.y > clientSize.height / 2 / gridInterval + 4 || p.y < -clientSize.height / 2 / gridInterval - 4) return false;
        }
        if (min <= max) {
          for (let i = min; i <= max; i++) {
            if (settings.gridType === "hexagon") {
              if (((i - k) % 3 + 3) % 3 === 1) continue;
            }
            points.push({
              base: p.add(d.mul(i))
            })
          }
          return true;
        } else {
          return false;
        }
      }

      const p = new Vector(0, 0);
      expandB(p, db, 0);
      for (let k = 0;; k++) {
        let r = expandB(p.add(da.mul(k)), db, k);
        r = expandB(p.add(da.mul(-k)), db, -k) || r;
        if (!r) break;
      }

    } else {
      const minX = -clientSize.width / 2 / gridInterval - 4;
      const maxX = clientSize.width / 2 / gridInterval + 4;
      const minY = -clientSize.height / 2 / gridInterval - 4;
      const maxY = clientSize.height / 2 / gridInterval + 4;
      const xcount = Math.floor(maxX - minX);
      const ycount = Math.floor(maxY - minY);
      const total = xcount * ycount;
      for (let i = 0; i < total; i++) {
        const x = Math.random() * (maxX - minX) + minX;
        const y = Math.random() * (maxY - minY) + minY;
        points.push({
          base: new Vector(x, y)
        })
      }

    }

    // const w = Math.ceil(clientSize.width / 2 / gridInterval) * 2 + 3;
    // const h = Math.ceil(clientSize.height / 2 / gridInterval) * 2 + 3;
    // // create a point grid of size h * w
    // const points = []
    // for (let i = 0; i < h; i++) {
    //   for (let j = 0; j < w; j++) {
    //     const id = points.length;
    //     points.push({
    //       base: new Vector(j - (w - 1) / 2, i - (h - 1) / 2),
    //     })
    //   }
    // }

    setPoints(points)
  }

  function userKeyPress(e) {
    const { clientSize, settings, showHelp } = G.current;
    /*
    gridInterval: 40,
    lineWidth: 10,
    displacementRatio: 3,
    basicSaturation: 0.5,
    rangeSaturation: 0.4,
    coordinateNoiseDensity: 0.05,
    hueNoiseDensity: 0.1,
    saturationNoiseDensity: 0.1,
    hueRange: 30,
    */
    if (keyIs(e, "z")) {
      // reset startTime
      const newSettings = {
        ...settings,
        startTime: Date.now() / 1000
      }
      recreatePoints(clientSize, newSettings);
      setSettings(newSettings);
    } else if (keyIs(e, "x")) {
      const drawHeadTypes = ["always", "never", "tooshort"];
      const i = drawHeadTypes.indexOf(settings.drawHeadType);
      const newSettings = {
        ...settings,
        drawHeadType: drawHeadTypes[(i + 1) % drawHeadTypes.length]
      }
      setSettings(newSettings)
    } else if (keyIs(e, "q") || keyIs(e, "w")) {
      const r = keyIs(e, "q") ? 0.8 : (1/0.8);
      const newSettings = {
        ...settings,
        gridInterval: settings.gridInterval * r
      }
      recreatePoints(clientSize, newSettings)
      setSettings(newSettings)
    } else if (keyIs(e, "e") || keyIs(e, "r")) {
      const r = keyIs(e, "e") ? 0.9 : (1/0.9);
      const newSettings = {
        ...settings,
        lineWidth: settings.lineWidth * r
      }
      setSettings(newSettings)
    } else if (keyIs(e, "t") || keyIs(e, "y")) {
      const r = keyIs(e, "t") ? 0.9 : (1/0.9);
      const newSettings = {
        ...settings,
        displacementRatio: settings.displacementRatio * r
      }
      setSettings(newSettings)
    } else if (keyIs(e, "u") || keyIs(e, "i")) {
      const r = keyIs(e, "u") ? 0.9 : (1/0.9);
      const newSettings = {
        ...settings,
        basicSaturation: settings.basicSaturation * r
      }
      setSettings(newSettings)
    } else if (keyIs(e, "o") || keyIs(e, "p")) {
      const r = keyIs(e, "o") ? 0.9 : (1/0.9);
      const newSettings = {
        ...settings,
        rangeSaturation: settings.rangeSaturation * r
      }
      setSettings(newSettings)
    } else if (keyIs(e, "a") || keyIs(e, "s")) {
      const r = keyIs(e, "a") ? 0.9 : (1/0.9);
      const newSettings = {
        ...settings,
        coordinateNoiseDensity: settings.coordinateNoiseDensity * r
      }
      setSettings(newSettings)
    } else if (keyIs(e, "d") || keyIs(e, "f")) {
      const r = keyIs(e, "d") ? 0.9 : (1/0.9);
      const newSettings = {
        ...settings,
        hueNoiseDensity: settings.hueNoiseDensity * r
      }
      setSettings(newSettings)
    } else if (keyIs(e, "g") || keyIs(e, "h")) {
      const r = keyIs(e, "g") ? 0.9 : (1/0.9);
      const newSettings = {
        ...settings,
        saturationNoiseDensity: settings.saturationNoiseDensity * r
      }
      setSettings(newSettings)
    } else if (keyIs(e, "j") || keyIs(e, "k")) {
      const r = keyIs(e, "j") ? 0.9 : (1/0.9);
      const newSettings = {
        ...settings,
        hueRange: settings.hueRange * r
      }
      setSettings(newSettings)
    } else if (keyIs(e, "l") || keyIs(e, ";") || keyIs(e, ":")) {
      const r = keyIs(e, "l") ? 0.9 : (1/0.9);
      const newSettings = {
        ...settings,
        timeScale: settings.timeScale * r
      }
      setSettings(newSettings)
    } else if (keyIs(e, "c")) {
      const gridTypes = ["square", "triangle", "hexagon", "random"];
      const i = gridTypes.indexOf(settings.gridType);
      const newSettings = {
        ...settings,
        gridType: gridTypes[(i + 1) % gridTypes.length]
      }
      recreatePoints(clientSize, newSettings)
      setSettings(newSettings)
    } else if (keyIs(e, "n") || keyIs(e, "m")) {
      const r = keyIs(e, "n") ? 1 : -1;
      const newSettings = {
        ...settings,
        gridRotation: settings.gridRotation + r * 5 * Math.PI / 180,
      }
      recreatePoints(clientSize, newSettings)
      setSettings(newSettings)
    } else if (keyIs(e, "v")) {
      // clear cookies
      document.cookie = "grass_settings=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
      // refresh
      window.location.reload()
    } else if (keyIs(e, " ")) {
      console.log("space", showHelp)
      setShowHelp(!showHelp)
    }
  }
  
  useEffect(() => {
    // load cookies
    const cookies = document.cookie.split(";").map((x) => x.trim());
    const settingsCookie = cookies.find((x) => x.startsWith("grass_settings="));
    let newSettings = {
      ...settings,
      startTime: Date.now() / 1000
    }
    if (settingsCookie != null) {
      const settingsStr = settingsCookie.split("=")[1];
      const loaded = JSON.parse(settingsStr);
      newSettings = {
        ...settings,
        ...loaded,
        startTime: Date.now() / 1000
      }
      setSettings(newSettings);
    } else {
      setSettings(newSettings);
    }
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
    const newClientSize = {
      width: window.innerWidth,
      height: window.innerHeight
    }
    setClientSize(newClientSize)
    recreatePoints(newClientSize, newSettings);
    // prevent context menu for right click for canvas
    // window.addEventListener("contextmenu", (e) => {
    //   e.preventDefault();
    // })
    // window.addEventListener("keydown", userKeyDown);
    window.addEventListener("keypress", userKeyPress);
    
    if (renderInterval != null) {
      clearInterval(renderInterval);
    }
    const newRenderInterval = setInterval(() => {
      redraw();
    }, 1000 / fps);
    setRenderInterval(newRenderInterval);

  }, [])

  return <>
    <ThemeProvider theme={theme}> 
    <Box sx={{
      width: "100%",
      height: "100vh",
      backgroundColor: "darkgray",
      display: "flex"
    }}>
      <canvas width={clientSize.width} height={clientSize.height} ref={canvasRef} 
        onClick={() => setShowHelp(!showHelp)}
      />
    </Box>
    <Backdrop open={showHelp} sx={{zIndex: 1000}} onClick={() => setShowHelp(false)}>
      <Paper
        sx={{
          // backgroundColor: "rgba(20, 20, 20, 0.8)",
          minWidth: 500,
          maxWidth: 800,
          width: "50%",
        }}
      ><Box padding={2}>
        <Grid2 container spacing={1}>

          <GridItem size={3} monospace>[space]</GridItem>
          <GridItem size={9}>open / close this help.</GridItem>

          <GridItem size={3} monospace>[q] [w]</GridItem>
          <GridItem size={7}>adjust grid interval.</GridItem>
          <GridItem size={2}>({settings.gridInterval.toFixed(2)})</GridItem>

          <GridItem size={3} monospace>[e] [r]</GridItem>
          <GridItem size={7}>adjust line width.</GridItem>
          <GridItem size={2}>({settings.lineWidth.toFixed(2)})</GridItem>

          <GridItem size={3} monospace>[t] [y]</GridItem>
          <GridItem size={7}>adjust displacement ratio.</GridItem>
          <GridItem size={2}>({settings.displacementRatio.toFixed(2)})</GridItem>

          <GridItem size={3} monospace>[u] [i]</GridItem>
          <GridItem size={7}>adjust basic saturation.</GridItem>
          <GridItem size={2}>({settings.basicSaturation.toFixed(2)})</GridItem>

          <GridItem size={3} monospace>[o] [p]</GridItem>
          <GridItem size={7}>adjust range saturation.</GridItem>
          <GridItem size={2}>({settings.rangeSaturation.toFixed(2)})</GridItem>

          <GridItem size={3} monospace>[a] [s]</GridItem>
          <GridItem size={7}>adjust coordinate noise density.</GridItem>
          <GridItem size={2}>({settings.coordinateNoiseDensity.toFixed(2)})</GridItem>

          <GridItem size={3} monospace>[d] [f]</GridItem>
          <GridItem size={7}>adjust hue noise density.</GridItem>
          <GridItem size={2}>({settings.hueNoiseDensity.toFixed(2)})</GridItem>

          <GridItem size={3} monospace>[g] [h]</GridItem>
          <GridItem size={7}>adjust saturation noise density.</GridItem>
          <GridItem size={2}>({settings.saturationNoiseDensity.toFixed(2)})</GridItem>

          <GridItem size={3} monospace>[j] [k]</GridItem>
          <GridItem size={7}>adjust hue range.</GridItem>
          <GridItem size={2}>({settings.hueRange.toFixed(2)})</GridItem>

          <GridItem size={3} monospace>[l] [;]</GridItem>
          <GridItem size={7}>adjust time scale.</GridItem>
          <GridItem size={2}>({settings.timeScale.toFixed(2)})</GridItem>

          <GridItem size={3} monospace>[c]</GridItem>
          <GridItem size={7}>change grid type.</GridItem>
          <GridItem size={2}>({settings.gridType})</GridItem>

          <GridItem size={3} monospace>[n] [m]</GridItem>
          <GridItem size={7}>rotate grid.</GridItem>
          <GridItem size={2}>({(settings.gridRotation / Math.PI * 180).toFixed(0)} deg)</GridItem>

          <GridItem size={3} monospace>[x]</GridItem>
          <GridItem size={7}>toggle draw head type.</GridItem>
          <GridItem size={2}>({settings.drawHeadType})</GridItem>

          <GridItem size={3} monospace>[z]</GridItem>
          <GridItem size={9}>reinitialize points.</GridItem>

          <GridItem size={3} monospace>[v]</GridItem>
          <GridItem size={9}>reset, clear cookies and refresh.</GridItem>

        </Grid2>
      </Box></Paper>
    </Backdrop>
  </ThemeProvider>
  </>

}