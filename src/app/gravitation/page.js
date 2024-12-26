"use client"

import { 
  Box, Paper, Stack, Divider, Button, TextField, ThemeProvider, Typography,
  FormControl, InputLabel, Select, MenuItem, OutlinedInput, InputAdornment, Input, FormHelperText, Grid2,
  List, ListItem, ListItemText, IconButton
} from "@mui/material"
import Head from "next/head"
import { Delete as DeleteIcon } from "@mui/icons-material"
import { useState, useEffect, useRef } from "react"
import { createTheme } from "@mui/material/styles"
import { Color } from "../utils"

function hypot(x, y) {
  return Math.sqrt(x ** 2 + y ** 2);
}

class Vector {
  static add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
  }
  static sub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
  }
  static mul(a, k) {
    return { x: a.x * k, y: a.y * k };
  }
  static div(a, k) {
    return { x: a.x / k, y: a.y / k };
  }
  static length(a) {
    return hypot(a.x, a.y);
  }
  static normalize(a) {
    const l = hypot(a.x, a.y);
    return { x: a.x / l, y: a.y / l };
  }
  static rotate(a, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { x: a.x * cos - a.y * sin, y: a.x * sin + a.y * cos };
  }
}

function collision(m1, vx1, vy1, m2, vx2, vy2, dx, dy) {
  // let angle be defined by arctan(dy / dx)
  // First, we take the reference frame of c2. Now c2 is stationary while c1 is colliding with (vx1 - vx2, vy1 - vy2) velocity.
  // We can have 4 equations
  //   1) energy conservation
  //   2) momentum conservation in x direction
  //   3) momentum conservation in y direction
  //   4) IMPORTANT: after collision, the new vy2'/vx2' is tan(angle)
  // If we don't make the change to the reference frame, the 4th equation would change as
  //   4) (vy2' - vy1') / (vx2' - vx1') = tan(angle)

  const r = m2 / m1;
  const rvx = vx1 - vx2;
  const rvy = vy1 - vy2;
  const rvy2 = (2 * dx * dy * rvx + 2 * (dy ** 2) * rvy) / ((r + 1) * (dx ** 2 + dy ** 2));
  const rvx2 = (2 * dx * dy * rvy + 2 * (dx ** 2) * rvx) / ((r + 1) * (dx ** 2 + dy ** 2));
  const rvy1 = rvy - r * rvy2;
  const rvx1 = rvx - r * rvx2;
  return {
    vx1: vx2 + rvx1,
    vy1: vy2 + rvy1,
    vx2: vx2 + rvx2,
    vy2: vy2 + rvy2,
  }
}

function pinnedCollision(m1, m2, vx2, vy2, dx, dy) {
  // c1 is pinned, c2 is colliding with (vx2, vy2) velocity
  const theta = Math.atan2(dy, dx);
  const alpha = Math.atan2(-vy2, -vx2);
  const newAlpha = 2 * theta - alpha;
  const v = hypot(vx2, vy2);
  return {
    vx2: v * Math.cos(newAlpha),
    vy2: v * Math.sin(newAlpha),
  }
}

function Italics({ children }) {
  return <span style={{ fontStyle: "italic" }}>{children}</span>
}

function AlignedTextPair(text1, text2, width="5rem") {
  return <Stack direction="row" spacing={1}>
    <Typography sx={{ 
      width: width, textAlign: "right",
    }}>{text1}</Typography>
    <Typography>{text2}</Typography>
  </Stack>
}

function BulletinText({ children, width="15rem", ...props }) {
  return <Box width={width}>
    <Stack direction="row" useFlexGap spacing={1} width="100%">
      <Typography variant="body2" sx={{ fontWeight: "bold" }}>•</Typography>
      <Typography sx={{
        whiteSpace: "pre-wrap",
        fontSize: "0.8rem",
        ...props.sx
      }}>
        {children}
      </Typography>
    </Stack>
  </Box>
}

function AlignedNumberInput(label, value, onChange, unit=null, width="5rem", readonly=false, props={}) {
  return <FormControl fullWidth variant="standard" size="small">
    <InputLabel htmlFor="number-input"
    >{label}</InputLabel>
    <Input
      id="number-input"
      readOnly={readonly}
      value={value}
      onChange={onChange}
      size="small"
      sx={{ width: width }}
      variant="standard"
      label={label}
      aria-describedby="number-input-label"
      endAdornment={unit === null ? null : <InputAdornment position="end">{unit}</InputAdornment>}
      {...props}
    />
  </FormControl>
}

function ScientificNumberText(value, unit, precision=2) {
  let exp = 0;
  let originalValue = value;
  if (value !== 0) {
    while (Math.abs(value) < 1) {
      value *= 10;
      exp -= 1;
    }
    while (Math.abs(value) >= 10) {
      value /= 10;
      exp += 1;
    }
  }
  if (unit !== null && unit !== "" && unit !== undefined) {
    if (exp < 3 && exp > -3) {
      return <span>{originalValue.toFixed(precision)} {unit}</span>
    } else {
      return <span>{value.toFixed(precision)} × 10<sup>{exp}</sup> {unit}</span>
    }
  } else {
    if (exp < 3 && exp > -3) {
      return <span>{originalValue.toFixed(precision)}</span>
    } else {
      return <span>{value.toFixed(precision)} × 10<sup>{exp}</sup></span>
    }
  }
}

function CButton({ children, ...props }) {
  return <Button {...props} size="small" sx={{
    textTransform: "none",
    ...props.sx
  }}>{children}</Button>
}

export default function GravitationPage() {

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
  const canvasRef = useRef(null)
  const [controlState, setControlState] = useState({
    mode: "pause", // play, pause, create, edit, velocity
    pixelsPerMeter: 100,
    cameraCenter: { x: 0, y: 0 },
    createMassFormula: "volumeDensity", // volumeDensity, areaDensity, fixed
    createMassValue: "10", // this could be density or a fixed mass; need to convert to float before using
    gravitationalConstant: "6.67430e-1",
    gravitationFormula: "inverseSquare", // inverseSquare, inverseLinear, inverseCube,
    confinedBox: false,
    guiHidden: false,
    traceTicks: "500",
    traceType: "selected", // none, selected, all
    drawVectorType: "none", // none, velocity, force, acceleration
    drawVectorSubjects: "selected", // selected, all
    drawVectorUnit: 100,
    helpHidden: false,
    drawGrid: true,
    drawGridLegend: true,
    arrowWidth: 4,
    arrowHead: 24,
    selectedRecordedVelocityIndex: 0,
  })
  const [recordedVelocities, setRecordedVelocities] = useState([])
  const [renderInterval, setRenderInterval] = useState(null)
  const [balls, setBalls] = useState([])
  const [dragInfo, setDragInfo] = useState({
    isDragging: false,
    mouseKey: null,
    dragStart: { x: 0, y: 0 },
    dragEnd: { x: 0, y: 0 },
  })
  const [highlightedBallIndex, setHighlightedBallIndex] = useState(null)
  const [selectedBallIndex, setSelectedBallIndex] = useState(null)
  const [centeredBallIndex, setCenteredBallIndex] = useState(null)
  const [temporaryValue, setTemporaryValue] = useState("")

  function saveState() {
    let state = {};
    // from controlState: pixelsPerMeter, cameraCenter, gravitationalConstant, gravitationFormula, confinedBox
    // from balls: don't record color, trace
    state.controlState = {
      pixelsPerMeter: controlState.pixelsPerMeter,
      cameraCenter: controlState.cameraCenter,
      gravitationalConstant: controlState.gravitationalConstant,
      gravitationFormula: controlState.gravitationFormula,
      confinedBox: controlState.confinedBox,
    }
    state.balls = balls.map((ball) => {
      return {
        center: { ...ball.center },
        radius: ball.radius,
        mass: ball.mass,
        velocity: { ...ball.velocity },
        pinned: ball.pinned,
      }
    })
    return JSON.stringify(state, null, 2);
  }

  function loadState(jsonDict) {
    if (jsonDict === null) { return; }
    let state = JSON.parse(jsonDict);
    if (state.controlState === undefined || state.balls === undefined) { return; }
    setControlState({
      ...controlState,
      mode: "pause",
      pixelsPerMeter: state.controlState.pixelsPerMeter,
      cameraCenter: state.controlState.cameraCenter,
      gravitationalConstant: state.controlState.gravitationalConstant,
      gravitationFormula: state.controlState.gravitationFormula,
      confinedBox: state.controlState.confinedBox,
    })
    setBalls(state.balls.map((ball) => {
      return {
        center: { ...ball.center },
        radius: ball.radius,
        mass: ball.mass,
        velocity: { ...ball.velocity },
        pinned: ball.pinned,
        trace: [],
        color: Color.fromHSV(Math.random() * 360, 0.5, 1),
      }
    }))
  }

  const timedEventHelper = useRef({
    canvasRef,
    controlState,
    balls,
    dragInfo,
    clientSize,
    highlightedBallIndex,
    selectedBallIndex,
    centeredBallIndex,
    recordedVelocities,
  });
  
  useEffect(() => {
    timedEventHelper.current = {
      canvasRef,
      controlState,
      balls,
      dragInfo,
      clientSize,
      highlightedBallIndex,
      selectedBallIndex,
      centeredBallIndex,
      recordedVelocities,
    }
  });
  
  const metersToPixels = (meters) => {
    if (timedEventHelper.current === null) { return 0; }
    return meters * timedEventHelper.current.controlState.pixelsPerMeter;
  };
  const pixelsToMeters = (pixels) => {
    if (timedEventHelper.current === null) { return 0; }
    return pixels / timedEventHelper.current.controlState.pixelsPerMeter;
  };
  const getCameraCenter = () => {
    if (timedEventHelper.current === null) { return { x: 0, y: 0 }; }
    let { controlState, dragInfo, centeredBallIndex } = timedEventHelper.current;
    if (centeredBallIndex !== null) {
      return balls[centeredBallIndex].center;
    }
    if (dragInfo.isDragging && dragInfo.mouseKey === 1) { // middle mouse button
      // displace the camera center by drag distance
      const dragDistance = {
        x: pixelsToMeters(dragInfo.dragEnd.x - dragInfo.dragStart.x),
        y: pixelsToMeters(dragInfo.dragEnd.y - dragInfo.dragStart.y),
      }
      return { x: controlState.cameraCenter.x - dragDistance.x, y: controlState.cameraCenter.y + dragDistance.y };
    } else {
      // camera center is fixed
      return controlState.cameraCenter;
    }
  }
  const worldToScreen = (worldCoord) => {
    if (timedEventHelper.current === null) { return { x: 0, y: 0 }; }
    // world y is from bottom to up
    const { clientSize, controlState } = timedEventHelper.current;
    const center = getCameraCenter();
    return {
      x: clientSize.width / 2 + metersToPixels(worldCoord.x - center.x),
      y: clientSize.height / 2 - metersToPixels(worldCoord.y - center.y),
    }
  }
  const screenToWorld = (screenCoord) => {
    if (timedEventHelper.current === null) { return { x: 0, y: 0 }; }
    const { clientSize, controlState } = timedEventHelper.current;
    const center = getCameraCenter();
    return {
      x: center.x + pixelsToMeters(screenCoord.x - clientSize.width / 2),
      y: center.y - pixelsToMeters(screenCoord.y - clientSize.height / 2),
    }
  }
  const getWorldViewport = () => {
    if (timedEventHelper.current === null) { return { minX: 0, maxX: 0, minY: 0, maxY: 0 }; }
    const { clientSize, controlState } = timedEventHelper.current;
    const center = getCameraCenter();
    const width = clientSize.width / controlState.pixelsPerMeter;
    const height = clientSize.height / controlState.pixelsPerMeter;
    return {
      minX: center.x - width / 2,
      maxX: center.x + width / 2,
      minY: center.y - height / 2,
      maxY: center.y + height / 2,
    }
  }

  function calculateForceBetween(subject, object, G) {
    const dx = object.center.x - subject.center.x;
    const dy = object.center.y - subject.center.y;
    const distance = hypot(dx, dy) + 1e-6; // avoid division by zero
    let forceBottom = distance ** 2;
    if (controlState.gravitationFormula === "inverseLinear") {
      forceBottom = distance;
    } else if (controlState.gravitationFormula === "inverseCube") {
      forceBottom = distance ** 3;
    }
    const forceMagnitude = G * subject.mass * object.mass / forceBottom;
    const forceX = forceMagnitude * dx / distance;
    const forceY = forceMagnitude * dy / distance;
    return { x: forceX, y: forceY };
  }

  function calculateForce(targetBall, balls, skipIndex) {
    let force = { x: 0, y: 0 };
    const controlState = timedEventHelper.current.controlState;
    const G = parseFloat(controlState.gravitationalConstant);
    if (isNaN(G)) { return force; }
    balls.forEach((otherBall, otherIndex) => {
      if (skipIndex === otherIndex) { return; }
      const forceBetween = calculateForceBetween(targetBall, otherBall, G);
      force.x += forceBetween.x;
      force.y += forceBetween.y;
    })
    return force;
  }

  function redraw() {
    if (timedEventHelper.current === null) { return; }
    const { canvasRef, controlState, balls, dragInfo, clientSize, highlightedBallIndex, selectedBallIndex, centeredBallIndex } = timedEventHelper.current;
    if (canvasRef.current === null) { return; }
    const mode = controlState.mode;

    // create an offscreen canvas
    const offscreenCanvas = new OffscreenCanvas(clientSize.width, clientSize.height);
    const offscreenContext = offscreenCanvas.getContext("2d");
    // offscreenContext.lineCap = "round";

    // main draw procedure
    const drawCircle = (screenCenter, radius, color, borderColor = "none", borderWidth = 0) => {
      const { x, y } = screenCenter;
      offscreenContext.beginPath();
      offscreenContext.arc(x, y, radius, 0, 2 * Math.PI);
      offscreenContext.fillStyle = color;
      offscreenContext.fill();
      if (borderColor !== "none" && borderWidth > 0) {
        offscreenContext.strokeStyle = borderColor;
        offscreenContext.lineWidth = borderWidth;
        offscreenContext.stroke();
      }
    };
    const drawLine = (start, end, color, width = 1) => {
      offscreenContext.beginPath();
      offscreenContext.moveTo(start.x, start.y);
      offscreenContext.lineTo(end.x, end.y);
      offscreenContext.strokeStyle = color;
      offscreenContext.lineWidth = width;
      offscreenContext.stroke();
    };
    const drawArrow = (start, end, color, width = 4, head = 8) => {
      const displacement = Vector.sub(end, start);
      const length = Vector.length(displacement);
      if (length < head) { return; }
      const dy = Vector.normalize(Vector.sub(end, start));
      const dx = Vector.rotate(dy, Math.PI / 2);
      const p0 = Vector.add(start, Vector.mul(dx, width / 2));
      const p6 = Vector.add(start, Vector.mul(dx, -width / 2));
      const p1 = Vector.add(p0, Vector.mul(dy, length - head * 2 / 3));
      const p5 = Vector.add(p6, Vector.mul(dy, length - head * 2 / 3));
      const p2 = Vector.add(Vector.add(p1, Vector.mul(dx, width * 1.5)), Vector.mul(dy, -head / 3));
      const p4 = Vector.add(Vector.add(p5, Vector.mul(dx, -width * 1.5)), Vector.mul(dy, -head / 3));
      const p3 = end;
      offscreenContext.moveTo(p0.x, p0.y);
      offscreenContext.beginPath();
      offscreenContext.lineTo(p1.x, p1.y);
      offscreenContext.lineTo(p2.x, p2.y);
      offscreenContext.lineTo(p3.x, p3.y);
      offscreenContext.lineTo(p4.x, p4.y);
      offscreenContext.lineTo(p5.x, p5.y);
      offscreenContext.lineTo(p6.x, p6.y);
      offscreenContext.lineTo(p0.x, p0.y);
      // fill
      offscreenContext.fillStyle = color;
      offscreenContext.fill();
    }

    // draw background grid
    {
      const worldViewport = getWorldViewport();
      const worldWidth = worldViewport.maxX - worldViewport.minX;
      const worldHeight = worldViewport.maxY - worldViewport.minY;
      const worldCenter = getCameraCenter();
      const worldLeft = worldCenter.x - worldWidth / 2;
      const worldRight = worldCenter.x + worldWidth / 2;
      const worldBottom = worldCenter.y - worldHeight / 2;
      function drawGrid(unit, color, width, legendExponent = null) {
        const gridLeft = Math.floor(worldLeft / unit) * unit;
        const gridBottom = Math.floor(worldBottom / unit) * unit;
        if (controlState.drawGrid) {
          let x = gridLeft;
          while (x < worldRight) {
            const screenX = worldToScreen({ x, y: 0 }).x;
            drawLine({ x: screenX, y: 0 }, { x: screenX, y: clientSize.height }, color, width);
            x += unit;
          }
        }
        if (controlState.drawGrid) {
          let y = gridBottom;
          while (y < worldBottom + worldHeight) {
            const screenY = worldToScreen({ x: 0, y }).y;
            drawLine({ x: 0, y: screenY }, { x: clientSize.width, y: screenY }, color, width);
            y += unit;
          }
        }
        if (legendExponent !== null) {
          // write a "10^legendExponent m" at bottom left
          let screenLegend = worldToScreen({ x: gridLeft + unit * 2, y: gridBottom + unit * 2 });
          if (!controlState.drawGrid) {
            screenLegend = { x: 100, y: clientSize.height - 100 }
          }
          offscreenContext.font = "12px Arial";
          offscreenContext.fillStyle = "white";
          offscreenContext.textAlign = "left";
          offscreenContext.textBaseline = "bottom";
          let text = `10^${legendExponent} m`;
          if (legendExponent == 0) { text = "1 m"; }
          if (legendExponent == 1) { text = "10 m"; }
          if (legendExponent == -1) { text = "0.1 m"; }
          const p1 = screenLegend;
          const p2 = { x: p1.x + metersToPixels(unit), y: p1.y };
          if (controlState.drawGridLegend) {
            offscreenContext.fillText(text, screenLegend.x + 3, screenLegend.y - 3);
            drawLine(p1, p2, "white", 3);
          }
        }
      }
      let unit = 1; let exponent = 0;
      while (unit * 10 > worldWidth) { unit /= 10; exponent -= 1; }
      while (unit * 10 <= worldWidth) { unit *= 10; exponent += 1; }
      unit /= 10; // now we have at least 10 units, at most 100 units on the screen width
      drawGrid(unit, "rgba(255, 255, 255, 0.2)", 1, exponent);
      if (unit * 30 < worldWidth) {
        drawGrid(unit * 5, "rgba(255, 255, 255, 0.1)", 3);
      }
    }

    // confined box
    if (controlState.confinedBox) {
      drawLine({ x: 0, y: 0 }, { x: clientSize.width, y: 0 }, "white", 10);
      drawLine({ x: clientSize.width, y: 0 }, { x: clientSize.width, y: clientSize.height }, "white", 10);
      drawLine({ x: clientSize.width, y: clientSize.height }, { x: 0, y: clientSize.height }, "white", 10);
      drawLine({ x: 0, y: clientSize.height }, { x: 0, y: 0 }, "white", 10);
    }

    // draw balls
    balls.forEach((ball, index) => {
      let screenCenter = worldToScreen(ball.center);
      // const screenRadius = metersToPixels(ball.radius);
      // TODO: if the ball is out of the screen, don't draw
      let borderColor = "black";
      let borderWidth = 1;
      let color = ball.color;
      let radius = ball.radius;
      if (mode === "create" && !dragInfo.isDragging && highlightedBallIndex === index) {
        borderColor = "red";
        borderWidth = 2;
        color = color.clone(); color.a = 0.5;
      } else if ((mode === "play" || mode === "pause" || mode === "velocity") && selectedBallIndex === index) {
        borderColor = "white";
        borderWidth = 5;
      } else if (mode === "edit" && selectedBallIndex === index) {
        borderColor = "white";
        borderWidth = 5;
        if (dragInfo.isDragging) {
          if (dragInfo.mouseKey === 0) {
            screenCenter = {
              x: screenCenter.x + dragInfo.dragEnd.x - dragInfo.dragStart.x,
              y: screenCenter.y + dragInfo.dragEnd.y - dragInfo.dragStart.y,
            }
          } else if (dragInfo.mouseKey === 2) {
            const screenDragEnd = dragInfo.dragEnd;
            const worldDragEnd = screenToWorld(screenDragEnd);
            radius = hypot(worldDragEnd.x - ball.center.x, worldDragEnd.y - ball.center.y);
          }
        }
      } else if ((mode === "play" || mode === "pause" || mode === "edit" || mode == "velocity") && highlightedBallIndex === index) {
        borderColor = "white";
        borderWidth = 2;
      } 
      drawCircle(screenCenter, metersToPixels(radius), color.toString(), borderColor, borderWidth);
      if (ball.pinned) {
        // draw a cross at center
        const crossSize = 10;
        const d1 = { x: -Math.SQRT2 / 2, y: Math.SQRT2 / 2 };
        const d2 = { x: Math.SQRT2 / 2, y: Math.SQRT2 / 2 };
        drawLine(Vector.add(screenCenter, Vector.mul(d1, crossSize)), Vector.add(screenCenter, Vector.mul(d1, -crossSize)), "black", 6);
        drawLine(Vector.add(screenCenter, Vector.mul(d2, crossSize)), Vector.add(screenCenter, Vector.mul(d2, -crossSize)), "black", 6);
      }
      if (
        ((mode === "play" || mode === "pause") && controlState.drawVectorType !== "none") ||
        (mode === "velocity")
      ) {
        const drawVectorType = mode === "velocity" ? "velocity" : controlState.drawVectorType;
        const drawThisBall = mode === "velocity" || (controlState.drawVectorSubjects === "all" || (controlState.drawVectorSubjects === "selected" && (selectedBallIndex === index || highlightedBallIndex === index)));
        if (drawThisBall) {
          let physicsVector = { x: 0, y: 0 };
          if (drawVectorType === "velocity") {
            physicsVector = ball.velocity;
          } else if (drawVectorType === "force") {
            physicsVector = calculateForce(ball, balls, index);
          } else if (drawVectorType === "acceleration") {
            physicsVector = Vector.div(calculateForce(ball, balls, index), ball.mass);
          }
          let screenVector = Vector.mul(physicsVector, controlState.drawVectorUnit);
          screenVector.y = -screenVector.y;
          let color = ball.color.clone();
          let hsv = color.toHSV();
          hsv.s = 0.5; hsv.v = 0.9;
          color = Color.fromHSV(hsv.h, hsv.s, hsv.v);
          drawArrow(screenCenter, Vector.add(screenCenter, screenVector), color.toString(), controlState.arrowWidth, controlState.arrowHead);
        }
      }
    })
    
    let traceTicks = parseInt(controlState.traceTicks);
    if (isNaN(traceTicks)) { traceTicks = 0; }
    balls.forEach((ball, index) => {
      if (!(controlState.mode === "play" || controlState.mode === "pause")) { return; }
      if (ball.pinned) { return; }
      const drawTrace = controlState.traceType === "all" || (controlState.traceType === "selected" && (selectedBallIndex === index || highlightedBallIndex === index));
      if (!drawTrace) { return; }
      const trace = ball.trace;
      if (trace.length < 2) { return; }
      let color = ball.color.clone(); 
      let hsv = color.toHSV();
      hsv.s = 1; hsv.v = 0.9;
      color = Color.fromHSV(hsv.h, hsv.s, hsv.v);
      color.a = 0.5;
      for (let i = 0; i < trace.length - 1; i++) {
        if (i >= traceTicks) { break; }
        const screenStart = worldToScreen(trace[i]);
        const screenEnd = worldToScreen(trace[i + 1]);
        color.a = 0.1 + 0.8 * i / traceTicks;
        drawLine(screenStart, screenEnd, color.toString(), 5);
      }

    })

    // draw drag info
    if (controlState.mode === "create" && dragInfo.isDragging && dragInfo.mouseKey === 0) {
      const screenCenter = dragInfo.dragStart;
      // const worldCenter = screenToWorld(screenCenter);
      const screenRadius = hypot(dragInfo.dragEnd.x - dragInfo.dragStart.x, dragInfo.dragEnd.y - dragInfo.dragStart.y);
      drawCircle(screenCenter, screenRadius, "rgba(255, 255, 255, 0.5)", "black", 1);
      drawLine(dragInfo.dragStart, dragInfo.dragEnd, "black", 2);
    }

    // draw to the main canvas
    const mainCanvas = canvasRef.current;
    const mainContext = mainCanvas.getContext("2d");
    // clear the main canvas
    mainContext.clearRect(0, 0, clientSize.width, clientSize.height);
    // draw background color
    {
      let background = "black";
      if (controlState.mode === "create") {
        background = theme.palette.green.backgroundDark;
      } else if (controlState.mode === "edit") {
        background = theme.palette.yellow.backgroundDark;
      } else if (controlState.mode === "velocity") {
        background = theme.palette.red.backgroundDark;
      }
      mainContext.fillStyle = background;
      mainContext.fillRect(0, 0, clientSize.width, clientSize.height);
    }
    mainContext.drawImage(offscreenCanvas, 0, 0);
  }

  useEffect(() => {
    if (controlState.mode !== "play") {
      redraw();
    }
  }, [clientSize, balls])

  useEffect(() => {
    redraw();
  }, [controlState, dragInfo, highlightedBallIndex, selectedBallIndex, centeredBallIndex])

  function calculateMass(radius, value, formula) {
    let v = parseFloat(value);
    if (isNaN(v)) { v = 1; }
    if (formula === "volumeDensity") {
      return 4 * Math.PI * v * radius ** 3 / 3;
    } else if (formula === "areaDensity") {
      return Math.PI * v * radius ** 2;
    } else {
      return v;
    }
  }
  
  function createBallMass(radius) {
    const cmf = controlState.createMassFormula;
    return calculateMass(radius, controlState.createMassValue, cmf);
  }

  function resetBallMass(oldRadius, oldMass, newRadius) {
    const cmf = controlState.createMassFormula;
    if (cmf === "volumeDensity") {
      return oldMass * (newRadius / oldRadius) ** 3;
    } else if (cmf === "areaDensity") {
      return oldMass * (newRadius / oldRadius) ** 2;
    } else {
      return oldMass;
    }
  }


  function tickTime(totalTime, splitCount) {
    let { canvasRef, controlState, balls, dragInfo, clientSize, highlightedBallIndex, selectedBallIndex, centeredBallIndex } = timedEventHelper.current;
    const G = parseFloat(controlState.gravitationalConstant);
    if (isNaN(G)) { return; }

    const deltaTime = totalTime / splitCount;

    // copy balls
    balls = balls.map((ball) => ({ ...ball }));
    let traceTicks = parseInt(controlState.traceTicks);
    if (isNaN(traceTicks)) { traceTicks = 0; }

    for (let i = 0; i < splitCount; i++) {
      
      // update position
      balls.forEach((ball) => {
        if (ball.pinned) { return; }
        ball.center.x += ball.velocity.x * deltaTime;
        ball.center.y += ball.velocity.y * deltaTime;
        if (traceTicks > 0) {
          ball.trace.push({ x: ball.center.x, y: ball.center.y });
          if (ball.trace.length > traceTicks) {
            ball.trace.shift();
          }
        }
      })
      
      // calculate force
      let force = balls.map((ball, index) => calculateForce(ball, balls, index));

      // collision
      balls.forEach((a, aIndex) => {
        balls.forEach((b, bIndex) => {
          if (aIndex >= bIndex) { return; }
          const dx = b.center.x - a.center.x;
          const dy = b.center.y - a.center.y;
          const distance = hypot(dx, dy);
          if (distance < a.radius + b.radius) {
            // need to update location so that the balls are not overlapping

            if (!a.pinned && !b.pinned) {
              
              const { vx1, vy1, vx2, vy2 } = collision(
                a.mass, a.velocity.x, a.velocity.y,
                b.mass, b.velocity.x, b.velocity.y,
                dx, dy
              );
              a.velocity.x = vx1;
              a.velocity.y = vy1;
              b.velocity.x = vx2;
              b.velocity.y = vy2;

              const touchX = a.center.x + a.radius * dx / (a.radius + b.radius);
              const touchY = a.center.y + a.radius * dy / (a.radius + b.radius);
              a.center.x = touchX - a.radius * dx / distance;
              a.center.y = touchY - a.radius * dy / distance;
              b.center.x = touchX + b.radius * dx / distance;
              b.center.y = touchY + b.radius * dy / distance;

            } else if (!a.pinned) {
              
              const { vx2, vy2 } = pinnedCollision(
                b.mass, a.mass, a.velocity.x, a.velocity.y, -dx, -dy
              );
              a.velocity.x = vx2;
              a.velocity.y = vy2;
              a.center.x = b.center.x - dx / distance * (a.radius + b.radius);
              a.center.y = b.center.y - dy / distance * (a.radius + b.radius);

            } else if (!b.pinned) {
              
              const { vx2, vy2 } = pinnedCollision(
                a.mass, b.mass, b.velocity.x, b.velocity.y, dx, dy
              );
              b.velocity.x = vx2;
              b.velocity.y = vy2;
              b.center.x = a.center.x + dx / distance * (a.radius + b.radius);
              b.center.y = a.center.y + dy / distance * (a.radius + b.radius);

            }
          }
        });
      });

      // border collision
      if (controlState.confinedBox) {
        let viewport = getWorldViewport();
        balls.forEach((ball) => {
          if (ball.center.x - ball.radius < viewport.minX) {
            ball.velocity.x = Math.abs(ball.velocity.x);
            ball.center.x = viewport.minX + ball.radius;
          }
          if (ball.center.x + ball.radius > viewport.maxX) {
            ball.velocity.x = -Math.abs(ball.velocity.x);
            ball.center.x = viewport.maxX - ball.radius;
          }
          if (ball.center.y - ball.radius < viewport.minY) {
            ball.velocity.y = Math.abs(ball.velocity.y);
            ball.center.y = viewport.minY + ball.radius;
          }
          if (ball.center.y + ball.radius > viewport.maxY) {
            ball.velocity.y = -Math.abs(ball.velocity.y);
            ball.center.y = viewport.maxY - ball.radius;
          }
        })
      }

      // update velocity
      balls.forEach((ball, index) => {
        if (!ball.pinned) {
          ball.velocity.x += force[index].x / ball.mass * deltaTime;
          ball.velocity.y += force[index].y / ball.mass * deltaTime;
        } else {
          // set 0
          ball.velocity.x = 0;
          ball.velocity.y = 0;
        }
      })

    }

    setBalls(balls);
    
  }

  function setRotateAround(indexA, indexB) {
    if (indexA === null || indexB === null || indexA === indexB) { return; }
    if (balls[indexA].pinned && balls[indexB].pinned) { return; }
    const controlState = timedEventHelper.current.controlState;
    const G = parseFloat(controlState.gravitationalConstant);
    if (isNaN(G)) { return; }
    let force = calculateForceBetween(balls[indexA], balls[indexB], G);
    // circular motion v^2 / r * m = F
    let displacement = Vector.sub(balls[indexA].center, balls[indexB].center);
    let distance = Vector.length(displacement);
    let direction = Vector.normalize(displacement);
    let tangent = Vector.rotate(direction, Math.PI / 2);
    const bA = balls[indexA];
    const bB = balls[indexB];
    if (bA.pinned) {
      // only set the velocity of bB
      const vm = Math.sqrt(Vector.length(force) * distance / bB.mass);
      const v = Vector.mul(tangent, vm);
      setBalls(balls.map((ball, index) => { if (index === indexB) { return { ...ball, velocity: v }; } return ball; }))
    } else if (bB.pinned) {
      // only set the velocity of bA
      const vm = Math.sqrt(Vector.length(force) * distance / bA.mass);
      const v = Vector.mul(tangent, -vm);
      setBalls(balls.map((ball, index) => { if (index === indexA) { return { ...ball, velocity: v }; } return ball; }))
    } else {
      // both rotate aroudn their center of mass
      const center = Vector.div(Vector.add(Vector.mul(bA.center, bA.mass), Vector.mul(bB.center, bB.mass)), bA.mass + bB.mass);
      const displacementA = Vector.sub(bA.center, center);
      const displacementB = Vector.sub(bB.center, center);
      const distanceA = Vector.length(displacementA);
      const distanceB = Vector.length(displacementB);
      const vmA = Math.sqrt(Vector.length(force) * distanceA / bA.mass);
      const vmB = Math.sqrt(Vector.length(force) * distanceB / bB.mass);
      const vA = Vector.mul(tangent, -vmA);
      const vB = Vector.mul(tangent, vmB);
      setBalls(balls.map((ball, index) => {
        if (index === indexA) { return { ...ball, velocity: vA }; }
        if (index === indexB) { return { ...ball, velocity: vB }; }
        return ball;
      }))
    }
  }
  
  useEffect(() => {
    const fps = 30;
    if (renderInterval !== null) {
      clearInterval(renderInterval);
    }
    if (controlState.mode === "play") {
      setRenderInterval(setInterval(() => {
        tickTime(1 / fps, 5);
        redraw();
      }, 1000 / fps));
    } else {
      setRenderInterval(null);
    }
  }, [controlState, centeredBallIndex])

  function findBallAtScreen(screenCoord) {
    const worldCoord = screenToWorld(screenCoord);
    let foundIndex = null;
    const balls = timedEventHelper.current.balls;
    balls.forEach((ball, index) => {
      if (hypot(ball.center.x - worldCoord.x, ball.center.y - worldCoord.y) < ball.radius) {
        foundIndex = index;
      }
    })
    return foundIndex;
  }

  function canvasMouseDown(e) {
    let mode = controlState.mode;
    setDragInfo({
      ...dragInfo,
      mouseKey: e.button,
      isDragging: true,
      dragStart: { x: e.clientX, y: e.clientY },
      dragEnd: { x: e.clientX, y: e.clientY },
    })
    if (mode === "create" && e.button === 2) { // mouse right button, delete the ball if mouse is inside
      // remove highlighted ball is enough
      if (highlightedBallIndex !== null) {
        setBalls(balls.filter((ball, index) => index !== highlightedBallIndex))
        setHighlightedBallIndex(null);
      }
    } else if (mode === "edit" && (e.button === 0 || e.button === 2)) {
      const foundIndex = findBallAtScreen({ x: e.clientX, y: e.clientY });
      if (foundIndex !== selectedBallIndex) {
        setSelectedBallIndex(foundIndex);
        if (foundIndex !== null) {setTemporaryValueOnEdit(balls[foundIndex]);}
      }
    } else if (mode === "play" || controlState.mode === "pause" || mode === "velocity") {
      const foundIndex = findBallAtScreen({ x: e.clientX, y: e.clientY });
      if (foundIndex !== selectedBallIndex) {
        setSelectedBallIndex(foundIndex);
      }
    }
  }

  function canvasMouseMove(e) {
    const mode = controlState.mode;
    if (!dragInfo.isDragging || (mode === "velocity" && dragInfo.mouseKey === 2 && selectedBallIndex !== null)) {
      // update highlighted
      const screenCenter = { x: e.clientX, y: e.clientY };
      let newHighlightedBallIndex = findBallAtScreen(screenCenter);
      if (newHighlightedBallIndex !== highlightedBallIndex) {
        setHighlightedBallIndex(newHighlightedBallIndex);
      }
    }
    if (dragInfo.isDragging) {
      setDragInfo({
        ...dragInfo,
        dragEnd: { x: e.clientX, y: e.clientY }
      })
      if (mode === "velocity" && dragInfo.mouseKey === 0 && selectedBallIndex !== null && balls[selectedBallIndex].pinned === false) {
        // update velocity of the selected ball
        const selectedBall = balls[selectedBallIndex];
        const screenDx = dragInfo.dragEnd.x - worldToScreen(selectedBall.center).x;
        const screenDy = dragInfo.dragEnd.y - worldToScreen(selectedBall.center).y;
        const physicsDx = screenDx / controlState.drawVectorUnit;
        const physicsDy = -screenDy / controlState.drawVectorUnit;
        setBalls(balls.map((ball, index) => {
          if (index === selectedBallIndex) {
            return {
              ...ball,
              velocity: { x: physicsDx, y: physicsDy },
            }
          }
          return ball;
        }))
      }
    }
  }

  function canvasMouseUp(e) {
    let mode = controlState.mode;
    if (!dragInfo.isDragging) {return; }
    setDragInfo({
      ...dragInfo,
      isDragging: false,
    })
    if (controlState.mode === "create" && dragInfo.mouseKey === 0) {
      const screenCenter = dragInfo.dragStart;
      const screenRadius = hypot(dragInfo.dragEnd.x - dragInfo.dragStart.x, dragInfo.dragEnd.y - dragInfo.dragStart.y);
      // if screen radius is too small, ignore
      if (screenRadius < 5) { return; }
      const worldCenter = screenToWorld(screenCenter);
      const worldRadius = pixelsToMeters(screenRadius);
      setBalls([
        ...balls,
        {
          center: worldCenter,
          radius: worldRadius,
          color: Color.fromHSV(Math.random() * 360, 0.5, 1),
          mass: createBallMass(worldRadius),
          velocity: { x: 0, y: 0 },
          trace: [],
          pinned: false,
        }
      ])
    } else if (mode === "edit" && dragInfo.isDragging && selectedBallIndex !== null && (dragInfo.mouseKey === 0 || dragInfo.mouseKey === 2)) {
      if (dragInfo.mouseKey === 0) {
        // update position of the selected ball
        const screenDx = dragInfo.dragEnd.x - dragInfo.dragStart.x;
        const screenDy = dragInfo.dragEnd.y - dragInfo.dragStart.y;
        const worldDx = pixelsToMeters(screenDx);
        const worldDy = pixelsToMeters(screenDy);
        setBalls(balls.map((ball, index) => {
          if (index === selectedBallIndex) {
            return {
              ...ball,
              center: {
                x: ball.center.x + worldDx,
                y: ball.center.y - worldDy,
              }
            }
          }
          return ball;
        }));
      } else if (dragInfo.mouseKey === 2) {
        // update radius and possibly mass
        const screenDragEnd = dragInfo.dragEnd;
        const worldDragEnd = screenToWorld(screenDragEnd);
        const newRadius = hypot(worldDragEnd.x - balls[selectedBallIndex].center.x, worldDragEnd.y - balls[selectedBallIndex].center.y);
        let newMass = resetBallMass(balls[selectedBallIndex].radius, balls[selectedBallIndex].mass, newRadius);
        setBalls(balls.map((ball, index) => {
          if (index === selectedBallIndex) {
            return {
              ...ball,
              radius: newRadius,
              mass: newMass,
            }
          }
          return ball;
        }))
      }
    } else if (mode === "velocity" && dragInfo.isDragging && dragInfo.mouseKey === 2 && selectedBallIndex !== null && highlightedBallIndex !== null) {
      let idA = selectedBallIndex;
      let idB = highlightedBallIndex;
      if (idA !== idB && !(balls[idA].pinned && balls[idB].pinned)) {
        setRotateAround(idA, idB);
      }
    } else if (dragInfo.mouseKey === 1 && centeredBallIndex === null) {
      // move camera center
      const dragDistance = {
        x: pixelsToMeters(dragInfo.dragEnd.x - dragInfo.dragStart.x),
        y: pixelsToMeters(dragInfo.dragEnd.y - dragInfo.dragStart.y),
      }
      setControlState({
        ...controlState,
        cameraCenter: {
          x: controlState.cameraCenter.x - dragDistance.x,
          y: controlState.cameraCenter.y + dragDistance.y,
        }
      })
    }
  }

  function setTemporaryValueOnEdit(targetBall, cmfOverride = null) {
    let cmf = controlState.createMassFormula;
    if (cmfOverride !== null) { cmf = cmfOverride; }
    let currentMassValue = 0;
    // calculate mass value according to the formula
    const ball = targetBall;
    if (cmf === "volumeDensity") {
      currentMassValue = ball.mass / (4 * Math.PI * ball.radius ** 3 / 3);
    } else if (cmf === "areaDensity") {
      currentMassValue = ball.mass / (Math.PI * ball.radius ** 2);
    } else {
      currentMassValue = ball.mass;
    }
    setTemporaryValue(currentMassValue.toFixed(3).toString());
  }

  function canvasMouseWheel(e) {
    // don't scale if is dragging
    if (dragInfo.isDragging) { return; }
    const delta = e.deltaY;
    const factor = 1.1;
    let mode = controlState.mode;
    if (mode == "edit" && (selectedBallIndex !== null || highlightedBallIndex !== null)) {
      let targetIndex = selectedBallIndex !== null ? selectedBallIndex : highlightedBallIndex;
      // update mass
      let newMass = balls[targetIndex].mass;
      if (delta < 0) {
        newMass *= factor;
      } else {
        newMass /= factor;
      }
      const newBalls = (balls.map((ball, index) => {
        if (index === targetIndex) {
          return {
            ...ball,
            mass: newMass,
          }
        }
        return ball;
      }))
      setBalls(newBalls);
      setTemporaryValueOnEdit(newBalls[targetIndex]);
    } else {
      if (delta < 0) {
        setControlState({
          ...controlState,
          pixelsPerMeter: controlState.pixelsPerMeter * factor,
        })
      } else {
        setControlState({
          ...controlState,
          pixelsPerMeter: controlState.pixelsPerMeter / factor,
        })
      }
    }
  }

  function userCenterSelected() {
    if (centeredBallIndex !== null) {
      setCenteredBallIndex(null);
      setControlState({
        ...controlState,
        cameraCenter: {...balls[centeredBallIndex].center},
      })
    } else {
      if (selectedBallIndex !== null) {
        setCenteredBallIndex(selectedBallIndex);
      }
    }
  }

  function calculateNewVectorUnit(newDrawVectorType) {
    let newUnit = controlState.drawVectorUnit;
    if (newDrawVectorType !== "none") {
      let maxPhysicsLength = 1e-6;
      balls.forEach((ball, index) => {
        if (ball.pinned) { return; }
        let physicsVector = { x: 0, y: 0 };
        if (newDrawVectorType === "velocity") {
          physicsVector = ball.velocity;
        } else if (newDrawVectorType === "force") {
          physicsVector = calculateForce(ball, balls, index);
        } else if (newDrawVectorType === "acceleration") {
          physicsVector = Vector.div(calculateForce(ball, balls, index), ball.mass);
        }
        let physicsLength = Vector.length(physicsVector);
        if (physicsLength > maxPhysicsLength) {
          maxPhysicsLength = physicsLength;
        }
      });
      newUnit = 1 / maxPhysicsLength * Math.min(clientSize.width, clientSize.height) / 3;
    }
    return newUnit;
  }

  function userChangeDrawVectorType(newDrawVectorType) {
    let newUnit = calculateNewVectorUnit(newDrawVectorType);
    setControlState({
      ...controlState,
      drawVectorType: newDrawVectorType,
      drawVectorUnit: newUnit,
    })
  }

  function setTraceLength(newTraceLength) {
    const controlState = timedEventHelper.current.controlState;
    setControlState({ ...controlState, traceTicks: newTraceLength });
    let v = parseInt(newTraceLength);
    if (isNaN(v)) { v = 0; }
    const balls = timedEventHelper.current.balls;
    let setAny = false;
    balls.forEach((ball) => {
      if (ball.trace.length > v) {
        setAny = true;
        ball.trace = ball.trace.slice(0, v);
      }
    })
    if (setAny) {
      setBalls([...balls]);
    }
  }

  function userGotoPlayPanel() {
    const controlState = timedEventHelper.current.controlState;
    if (controlState.mode !== "pause" && controlState.mode !== "play") {
      setControlState({ 
        ...controlState,
        mode: "pause",
        drawVectorUnit: calculateNewVectorUnit(controlState.drawVectorType),
      });
    }
  }

  function userGotoCreatePanel() {
    const controlState = timedEventHelper.current.controlState;
    setHighlightedBallIndex(null);
    setSelectedBallIndex(null);
    setCenteredBallIndex(null);
    setControlState({ ...controlState, mode: "create" });
  }

  function userGotoEditPanel() {
    const controlState = timedEventHelper.current.controlState;
    setControlState({ ...controlState, mode: "edit" });
  }

  function userGotoVelocityPanel() {
    const controlState = timedEventHelper.current.controlState;
    setControlState({ ...controlState, 
      mode: "velocity",
      drawVectorUnit: calculateNewVectorUnit("velocity"),
    });
  }

  function userSetGuiHidden() {
    const controlState = timedEventHelper.current.controlState;
    setControlState({ ...controlState, guiHidden: !controlState.guiHidden });
  }

  function userSetHelpHidden() {
    const controlState = timedEventHelper.current.controlState;
    setControlState({ ...controlState, helpHidden: !controlState.helpHidden });
  }

  function userKeyDown(e) {
    if (e.key === "z" || e.key === "Z") {
      console.log("z pressed");
      userGotoPlayPanel();
    } else if (e.key === "x" || e.key === "X") {
      userGotoCreatePanel();
    } else if (e.key === "c" || e.key === "C") {
      userGotoEditPanel();
    } else if (e.key === "v" || e.key === "V") {
      userGotoVelocityPanel();
    } else if (e.key === "h" || e.key === "H") {
      userSetHelpHidden();
    } else if (e.key === "a" || e.key === "A") {
      userSetGuiHidden();
    } else if (e.key === " ") {
      const controlState = timedEventHelper.current.controlState;
      if (controlState.mode === "play") {
        setControlState({ ...controlState, mode: "pause" });
      } else {
        setControlState({ ...controlState, mode: "play" });
      }
    } else if (e.key === "b" || e.key === "B") {
      const controlState = timedEventHelper.current.controlState;
      setControlState({ ...controlState, confinedBox: !controlState.confinedBox });
    } else if (e.key === "p" || e.key === "P") {
      let { balls, selectedBallIndex, highlightedBallIndex } = timedEventHelper.current;
      if (selectedBallIndex !== null || highlightedBallIndex !== null) {
        let pinId = selectedBallIndex !== null ? selectedBallIndex : highlightedBallIndex;
        setBalls(balls.map((ball, index) => {
          if (index === pinId) {
            return { ...ball, pinned: !ball.pinned };
          }
          return ball;
        }))
      }
    } else if (e.key === "r" || e.key === "R") {
      let { balls, selectedBallIndex, highlightedBallIndex } = timedEventHelper.current;
      if (selectedBallIndex !== null || highlightedBallIndex !== null) {
        let bid = selectedBallIndex !== null ? selectedBallIndex : highlightedBallIndex;
        setBalls(balls.map((ball, index) => {
          if (index === bid) {
            return { ...ball, velocity: { x: -ball.velocity.x, y: -ball.velocity.y } };
          }
          return ball;
        }))
      }
    } else if (e.key === "u" || e.key === "U") {
      let { balls, selectedBallIndex, highlightedBallIndex } = timedEventHelper.current;
      if (selectedBallIndex !== null || highlightedBallIndex !== null) {
        let bid = selectedBallIndex !== null ? selectedBallIndex : highlightedBallIndex;
        setBalls(balls.map((ball, index) => {
          if (index === bid) {
            return { ...ball, velocity: { x: 0, y: 0 } };
          }
          return ball;
        }))
      }
    } else if (e.key === "t" || e.key === "T") {
      const controlState = timedEventHelper.current.controlState;
      const newTraceType = controlState.traceType === "none" ? "selected" : (controlState.traceType === "selected" ? "all" : "none");
      setControlState({ ...controlState, traceType: newTraceType });
    }
  }

  function userKeyPress(e) {
    const controlState = timedEventHelper.current.controlState;
    if (!e.shiftKey) {
      if (e.key === "m" || e.key === "M") {
        // lengthen trace
        let traceTicks = parseInt(controlState.traceTicks);
        if (isNaN(traceTicks)) { traceTicks = 0; }
        traceTicks += 100;
        setTraceLength(traceTicks.toString());
      } else if (e.key === "n" || e.key === "N") {
        // shorten trace
        let traceTicks = parseInt(controlState.traceTicks);
        if (isNaN(traceTicks)) { traceTicks = 0; }
        traceTicks -= 100;
        if (traceTicks < 0) { traceTicks = 0; }
        setTraceLength(traceTicks.toString());
      } else if (e.key === "[" || e.key === "{") {
        // decrease vector unit
        let newUnit = controlState.drawVectorUnit / 1.1;
        setControlState({ ...controlState, drawVectorUnit: newUnit });
      } else if (e.key === "]" || e.key === "}") {
        // increase vector unit
        let newUnit = controlState.drawVectorUnit * 1.1;
        setControlState({ ...controlState, drawVectorUnit: newUnit });
      } else if (e.key === "k" || e.key === "K") {
        // decrease gravitational constant
        let newG = parseFloat(controlState.gravitationalConstant);
        if (isNaN(newG)) { newG = 1; }
        newG /= 1.1;
        setControlState({ ...controlState, gravitationalConstant: newG.toString() });
      } else if (e.key === "l" || e.key === "L") {
        // increase gravitational constant
        let newG = parseFloat(controlState.gravitationalConstant);
        if (isNaN(newG)) { newG = 1; }
        newG *= 1.1;
        setControlState({ ...controlState, gravitationalConstant: newG.toString() });
      } else if (e.key === "g" || e.key === "G") {
        // toggle grid
        let newGrid = !controlState.drawGrid;
        setControlState({ ...controlState, drawGrid: newGrid });
      }
    } else {
      if (e.key === "g" || e.key === "G") {
        // toggle grid legend
        let newGridLegend = !controlState.drawGridLegend;
        setControlState({ ...controlState, drawGridLegend: newGridLegend });
      } else if (e.key === "[" || e.key === "{") {
        const ratio = controlState.arrowHead / controlState.arrowWidth;
        let newArrowWidth = controlState.arrowWidth - 2;
        if (newArrowWidth < 2) { newArrowWidth = 2; }
        setControlState({ ...controlState, 
          arrowWidth: newArrowWidth,
          arrowHead: newArrowWidth * ratio
        });
      } else if (e.key === "]" || e.key === "}") {
        const ratio = controlState.arrowHead / controlState.arrowWidth;
        let newArrowWidth = controlState.arrowWidth + 2;
        setControlState({ ...controlState, 
          arrowWidth: newArrowWidth,
          arrowHead: newArrowWidth * ratio
        });
      }
    }
  }
  
  useEffect(() => {
    window.addEventListener("resize", () => {
      setClientSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    })
    setClientSize({
      width: window.innerWidth,
      height: window.innerHeight
    })
    // prevent context menu for right click for canvas
    window.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    })
    window.addEventListener("keydown", userKeyDown);
    window.addEventListener("keypress", userKeyPress);
  }, [])

  let subcontrolsPanel = null;
  let helpItems = [
    "Z, X, C, V: switch panel",
    "B: toggle confined box",
    "H: toggle help",
    "A: toggle gui",
    "P: pin/unpin selected",
    "R: reverse selected velocity",
    "U: set selected stationary",
    "T: toggle trace",
    "N/M: lengthen/shorten trace",
    "[/]: dec/increase vector unit",
    "shift-[/]: adjust arrow display",
    "K/L: dec/increase gravitational constant",
    "G: toggle grid",
    "shift-G: toggle grid legend",
    "middle-drag: move camera",
  ]
  if (controlState.mode === "create") {
    const cmf = controlState.createMassFormula;
    helpItems.push("left-drag: create");
    helpItems.push("right-click: remove");
    helpItems.push("scroll: zoom");
    subcontrolsPanel = <Stack direction="column" spacing={1}>
      <CButton variant="outlined" color="warning"
        onClick={() => {
          setBalls([]);
        }}
      >
        remove all ({balls.length})
      </CButton>
      <FormControl fullWidth variant="standard" size="small">
        <InputLabel id="create-mass-formula-label">mass formula</InputLabel>
        <Select
          labelId="create-mass-formula-label"
          value={controlState.createMassFormula}
          onChange={(e) => {
            setControlState({ ...controlState, createMassFormula: e.target.value });
          }}
        >
          <MenuItem value="volumeDensity">
            4π<Italics>ρr</Italics><sup>3</sup>/3
          </MenuItem>
          <MenuItem value="areaDensity">
            π<Italics>ρr</Italics><sup>2</sup>
          </MenuItem>
          <MenuItem value="fixed">
            <Italics>m</Italics>
          </MenuItem>
        </Select>
      </FormControl>
      {AlignedNumberInput(
        cmf === "volumeDensity" ? <span>volume density <Italics>ρ</Italics></span> : (cmf === "areaDensity" ? <span>area density <Italics>ρ</Italics></span> : <span>mass <Italics>m</Italics></span>),
        controlState.createMassValue, (e) => {
          setControlState({ ...controlState, createMassValue: e.target.value });
        },
        cmf === "volumeDensity" ? (
          <span>kg/m<sup>3</sup></span>
        ) : (cmf === "areaDensity" ? (
          <span>kg/m<sup>2</sup></span>
        ) : "kg"),
        "100%",
      )}
    </Stack>
  } else if (controlState.mode === "play" || controlState.mode === "pause") {
    const gf = controlState.gravitationFormula;
    helpItems.push("left-click: select");
    helpItems.push("scroll: zoom");
    helpItems.push("space: play/pause");
    subcontrolsPanel = <Stack direction="column" spacing={1}>
      <CButton 
        variant={(controlState.mode === "play") ? "contained" : "outlined"}
        color="blue"
        onClick={() => {
          if (controlState.mode === "play") {
            setControlState({ ...controlState, mode: "pause" });
          } else {
            setControlState({ ...controlState, mode: "play" });
          }
        }}
      >
        {controlState.mode === "play" ? "pause" : "start"}
      </CButton>

      <FormControl fullWidth variant="standard" size="small">
        <InputLabel id="gravitation-formula-label">gravitation formula</InputLabel>
        <Select
          labelId="gravitation-formula-label"
          value={controlState.gravitationFormula}
          onChange={(e) => {
            setControlState({ ...controlState, gravitationFormula: e.target.value });
          }}
        >
          <MenuItem value="inverseSquare">
            <Italics>G</Italics><Italics>m</Italics><sub>1</sub><Italics>m</Italics><sub>2</sub> / <Italics>r</Italics><sup>2</sup> [Newton 1687]
          </MenuItem>
          <MenuItem value="inverseLinear">
            <Italics>G</Italics><Italics>m</Italics><sub>1</sub><Italics>m</Italics><sub>2</sub> / <Italics>r</Italics>
          </MenuItem>
          <MenuItem value="inverseCube">
            <Italics>G</Italics><Italics>m</Italics><sub>1</sub><Italics>m</Italics><sub>2</sub> / <Italics>r</Italics><sup>3</sup>
          </MenuItem>
        </Select>
      </FormControl>

      {AlignedNumberInput(
        <span>gravitational constant <Italics>G</Italics></span>,
        controlState.gravitationalConstant, (e) => {
          setControlState({ ...controlState, gravitationalConstant: e.target.value });
        },
        <span>m<sup>{
          gf === "inverseSquare" ? "3" : (gf === "inverseLinear" ? "2" : "4")
        }</sup>/(kg·s<sup>2</sup>)</span>,
        "100%",
      )}
      
      <Box width="100%">
        <Grid2 container spacing={1}>
          <Grid2 size={6}>
            <CButton 
              variant={(controlState.confinedBox) ? "contained" : "outlined"}
              color="white"
              sx={{ width: "100%" }}
              onClick={() => {
                setControlState({ ...controlState, confinedBox: !controlState.confinedBox });
              }}
            >
              confining border
            </CButton>
          </Grid2>
          <Grid2 size={6}>
            <CButton 
              variant={centeredBallIndex === null ? "outlined" : "contained"}
              disabled={centeredBallIndex === null && selectedBallIndex === null}
              color="blue"
              sx={{ width: "100%" }}
              onClick={() => {
                userCenterSelected();
              }} 
            >
              {
                centeredBallIndex === null ? (
                  selectedBallIndex === null ? "center selected" :
                  "center [" + selectedBallIndex +"]"
                ) : "uncenter [" + centeredBallIndex +"]"
              }
            </CButton>
          </Grid2>
        </Grid2>
      </Box>

      
      <Box width="100%">
        <Grid2 container spacing={1}>
          <Grid2 size={6}>
            <FormControl fullWidth variant="standard" size="small">
              <InputLabel id="trace-type-label">trace which balls</InputLabel>
              <Select
                labelId="trace-type-label"
                value={controlState.traceType}
                onChange={(e) => {
                  setControlState({ ...controlState, traceType: e.target.value });
                }}
              >
                <MenuItem value="none">none</MenuItem>
                <MenuItem value="selected">selected</MenuItem>
                <MenuItem value="all">all of'em</MenuItem>
              </Select>
            </FormControl>
          </Grid2>
          <Grid2 size={6}>
            {AlignedNumberInput(
              <span>with a length of</span>,
              controlState.traceTicks, (e) => {
                setTraceLength(e.target.value);
              },
              "ticks",
              "100%",
              false,
              {
                disabled: controlState.traceType === "none"
              }
            )}
          </Grid2>
        </Grid2>
      </Box>

      <Box width="100%">
        <Grid2 container spacing={1}>
          <Grid2 size={6}>
            <FormControl fullWidth variant="standard" size="small">
              <InputLabel id="draw-vector-type-label">draw what vectors</InputLabel>
              <Select
                labelId="draw-vector-type-label"
                value={controlState.drawVectorType}
                onChange={(e) => {
                  userChangeDrawVectorType(e.target.value);
                }}
              >
                <MenuItem value="none">none</MenuItem>
                <MenuItem value="velocity">velocity</MenuItem>
                <MenuItem value="force">force</MenuItem>
                <MenuItem value="acceleration">acceleration</MenuItem>
              </Select>
            </FormControl>
          </Grid2>
          <Grid2 size={6}>
            <FormControl fullWidth variant="standard" size="small">
              <InputLabel id="draw-vector-subjects-label">of which balls</InputLabel>
              <Select
                labelId="draw-vector-subjects-label"
                value={controlState.drawVectorSubjects}
                disabled={controlState.drawVectorType === "none"}
                onChange={(e) => {
                  setControlState({ ...controlState, drawVectorSubjects: e.target.value });
                }}
              >
                <MenuItem value="selected">selected</MenuItem>
                <MenuItem value="all">all of'em</MenuItem>
              </Select>
            </FormControl>
          </Grid2>
        </Grid2>
      </Box>

      <Box width="100%">
        <Grid2 container spacing={1}>
          <Grid2 size={6}>
            <CButton 
              variant={"outlined"}
              color="green"
              sx={{ width: "100%" }}
              onClick={() => {
                let json = saveState();
                let blob = new Blob([json], {type: "application/json"});
                let url = URL.createObjectURL(blob);
                let a = document.createElement("a");
                a.href = url;
                a.download = "save.json";
                a.click();
                URL.revokeObjectURL(url);
                // release document element
                a.remove();
              }}
            >
              save to file
            </CButton>
          </Grid2>
          <Grid2 size={6}>
            <CButton 
              variant={"outlined"}
              color="yellow"
              sx={{ width: "100%" }}
              onClick={() => {
                let input = document.createElement("input");
                input.type = "file";
                input.accept = ".json";
                input.onchange = (e) => {
                  let file = e.target.files[0];
                  let reader = new FileReader();
                  reader.onload = (e) => {
                    let json = e.target.result;
                    loadState(json);
                  }
                  reader.readAsText(file);
                }
                input.click();
                input.remove();
              }} 
            >
              load from file
            </CButton> 
          </Grid2>
        </Grid2>
      </Box>

    </Stack>

  } else if (controlState.mode === "edit") {
    const cmf = controlState.createMassFormula;
    helpItems.push("left/right click: select");
    helpItems.push("left-drag: move");
    helpItems.push("right-drag: resize");
    if (selectedBallIndex !== null) {
      helpItems.push("scroll: change selected mass");
    } else if (highlightedBallIndex !== null) {
      helpItems.push("scroll: change highlighted mass");
    } else {
      helpItems.push("scroll: zoom");
    }
    subcontrolsPanel = <Stack direction="column" spacing={1}>
      <FormControl fullWidth variant="standard" size="small">
        <InputLabel id="create-mass-formula-label">resize mass</InputLabel>
        <Select
          labelId="create-mass-formula-label"
          value={controlState.createMassFormula}
          onChange={(e) => {
            setControlState({ ...controlState, createMassFormula: e.target.value });
            if (selectedBallIndex !== null) {
              setTemporaryValueOnEdit(balls[selectedBallIndex], e.target.value);
            }
          }}
        >
          <MenuItem value="volumeDensity">
            keep volume density
          </MenuItem>
          <MenuItem value="areaDensity">
            keep area density
          </MenuItem>
          <MenuItem value="fixed">
            keep fixed mass
          </MenuItem>
        </Select>
      </FormControl>
      {AlignedNumberInput(
        cmf === "volumeDensity" ? <span>volume density <Italics>ρ</Italics></span> : (cmf === "areaDensity" ? <span>area density <Italics>ρ</Italics></span> : <span>mass <Italics>m</Italics></span>),
        selectedBallIndex === null ? "select a ball" : temporaryValue,
        (e) => {
          setTemporaryValue(e.target.value);
          if (selectedBallIndex !== null) {
            let newMass = calculateMass(balls[selectedBallIndex].radius, e.target.value, cmf);
            setBalls(balls.map((ball, index) => {
              if (index === selectedBallIndex) {
                return {
                  ...ball,
                  mass: newMass,
                }
              }
              return ball;
            }))
          }
        },
        cmf === "volumeDensity" ? (
          <span>kg/m<sup>3</sup></span>
        ) : (cmf === "areaDensity" ? (
          <span>kg/m<sup>2</sup></span>
        ) : "kg"),
        "100%",
        selectedBallIndex === null
      )}
      
      <CButton 
        variant={(selectedBallIndex !== null && balls[selectedBallIndex].pinned) ? "contained" : "outlined"}
        disabled={selectedBallIndex === null}
        color="blue"
        sx={{ width: "100%" }}
        onClick={() => {
          if (selectedBallIndex !== null) {
            setBalls(balls.map((ball, index) => {
              if (index === selectedBallIndex) {
                return {
                  ...ball,
                  pinned: !ball.pinned,
                }
              }
              return ball;
            }))
          }
        }}
      >
        pin position{selectedBallIndex !== null ? " [" + selectedBallIndex + "]" : ""}
      </CButton>

    </Stack>
  } else if (controlState.mode === "velocity") {
    helpItems.push("left-click and drag: set velocity");
    helpItems.push(<span>right-click, drag to another ball and release: for the two balls, a rotation velocity is calculated and <strong>added to their original velocity</strong></span>);
    subcontrolsPanel = <Stack direction="column" spacing={1}>
      <CButton
        variant="outlined"
        color="blue"
        sx={{ width: "100%" }}
        disabled={selectedBallIndex === null}
        onClick={() => {
          if (selectedBallIndex !== null) {
            setBalls(balls.map((ball, index) => {
              if (index === selectedBallIndex) {
                return {
                  ...ball,
                  velocity: { x: -ball.velocity.x, y: -ball.velocity.y },
                }
              }
              return ball;
            }))
          }
        }}
      >reverse velocity{selectedBallIndex !== null ? " [" + selectedBallIndex + "]" : ""}</CButton>
      <CButton
        variant="outlined"
        color="blue"
        sx={{ width: "100%" }}
        disabled={selectedBallIndex === null}
        onClick={() => {
          if (selectedBallIndex !== null) {
            setBalls(balls.map((ball, index) => {
              if (index === selectedBallIndex) {
                return {
                  ...ball,
                  velocity: { x: 0, y: 0 },
                }
              }
              return ball;
            }))
          }
        }}
      >set stationary{selectedBallIndex !== null ? " [" + selectedBallIndex + "]" : ""}</CButton>
      <CButton
        variant="outlined"
        color="warning"
        sx={{ width: "100%" }}
        onClick={() => {
          setBalls(balls.map((ball, index) => {
            return {
              ...ball,
              velocity: { x: 0, y: 0 },
            }
          }))
        }}
      >set all stationary</CButton>

      <Divider />

      <CButton 
        variant={"outlined"}
        color="green"
        disabled={selectedBallIndex === null}
        sx={{ width: "100%" }}
        onClick={() => {
          setRecordedVelocities([
            ...recordedVelocities,
            balls[selectedBallIndex].velocity,
          ])
        }}
      >
        record selected [{selectedBallIndex}] vel to list
      </CButton>

      <List>
        {recordedVelocities.map((recordedVelocity, index) => {
          return <ListItem key={index}
            secondaryAction={
              <IconButton edge="end" aria-label="delete" size="small" onClick={() => {
                const newRecordedVelocities = recordedVelocities.filter((_, i) => i !== index);
                setRecordedVelocities(newRecordedVelocities);
                if (controlState.selectedRecordedVelocityIndex >= newRecordedVelocities.length) {
                  setControlState({
                    ...controlState,
                    selectedRecordedVelocityIndex: null,
                  })
                }
              }}>
                <DeleteIcon />
              </IconButton>
            }
            onClick={() => {
              setControlState({
                ...controlState,
                selectedRecordedVelocityIndex: index,
              })
            }}
            sx={{ 
              cursor: "pointer",
              height: "1.5rem",
              backgroundColor: controlState.selectedRecordedVelocityIndex === index ? theme.palette.red.backgroundDark : "transparent",
            }}
          >
            <ListItemText primary={
              <span>[{index}] ({ScientificNumberText(recordedVelocity.x)}, {ScientificNumberText(recordedVelocity.y)}) m/s</span>
            }></ListItemText>
          </ListItem>
        })}
        {recordedVelocities.length === 0 && <ListItem sx={{
          height: "1.5rem",
        }}>
          <ListItemText primary="(empty list)"></ListItemText>
        </ListItem>}
      </List>

      <CButton 
        variant={"outlined"}
        color="green"
        disabled={selectedBallIndex === null || recordedVelocities.length === 0}
        sx={{ width: "100%" }}
        onClick={() => {
          const sv = recordedVelocities[controlState.selectedRecordedVelocityIndex];
          if (sv !== undefined) {
            setBalls(balls.map((ball, index) => {
              if (index === selectedBallIndex) {
                return {
                  ...ball,
                  velocity: sv,
                }
              }
              return ball;
            }))
          }
        }}
      >
        set this to selected [{selectedBallIndex}]
      </CButton>

      <CButton 
        variant={"outlined"}
        color="yellow"
        disabled={selectedBallIndex === null || recordedVelocities.length === 0}
        sx={{ width: "100%" }}
        onClick={() => {
          const sv = recordedVelocities[controlState.selectedRecordedVelocityIndex];
          if (sv !== undefined) {
            setBalls(balls.map((ball, index) => {
              if (index === selectedBallIndex) {
                return {
                  ...ball,
                  velocity: Vector.add(ball.velocity, sv),
                }
              }
              return ball;
            }))
          }
        }}
      >
        add this to selected [{selectedBallIndex}]
      </CButton>

    </Stack>
  }
  
  let ballInfoPanel = null;
  {
    let ballIndex = "";
    let hasBall = false;
    let hasBallIndex = null;
    let worldRadius = 0;
    let mass = 0;
    let x = 0;
    let y = 0;
    let velocity = { x: 0, y: 0 };
    let force = null;
    let pinned = false;
    if (controlState.mode === "create" && dragInfo.isDragging && dragInfo.mouseKey === 0) { // is creating a ball
      let screenRadius = hypot(dragInfo.dragEnd.x - dragInfo.dragStart.x, dragInfo.dragEnd.y - dragInfo.dragStart.y);
      worldRadius = pixelsToMeters(screenRadius);
      mass = createBallMass(worldRadius);
      x = screenToWorld(dragInfo.dragStart).x;
      y = screenToWorld(dragInfo.dragStart).y;
      ballIndex = "new ball (" + balls.length + ")";
      velocity = { x: 0, y: 0 };
      hasBall = true;
    } else if (selectedBallIndex !== null) {
      if (controlState.mode === "edit" && dragInfo.isDragging) {
        if (dragInfo.mouseKey === 0) {
          ballIndex = selectedBallIndex.toString();
          worldRadius = balls[selectedBallIndex].radius;
          mass = balls[selectedBallIndex].mass;
          x = balls[selectedBallIndex].center.x + pixelsToMeters(dragInfo.dragEnd.x - dragInfo.dragStart.x);
          y = balls[selectedBallIndex].center.y - pixelsToMeters(dragInfo.dragEnd.y - dragInfo.dragStart.y);
          velocity = balls[selectedBallIndex].velocity;
          const temporaryBall = {...balls[selectedBallIndex]};
          temporaryBall.center = { x, y };
          force = calculateForce(temporaryBall, balls, selectedBallIndex);
          pinned = temporaryBall.pinned;
          hasBall = true;
        } else if (dragInfo.mouseKey === 2) {
          ballIndex = selectedBallIndex.toString();
          worldRadius = hypot(
            balls[selectedBallIndex].center.x - screenToWorld(dragInfo.dragEnd).x,
            balls[selectedBallIndex].center.y - screenToWorld(dragInfo.dragEnd).y
          );
          mass = resetBallMass(balls[selectedBallIndex].radius, balls[selectedBallIndex].mass, worldRadius);
          x = balls[selectedBallIndex].center.x;
          y = balls[selectedBallIndex].center.y;
          velocity = balls[selectedBallIndex].velocity;
          const temporaryBall = {...balls[selectedBallIndex]};
          temporaryBall.radius = worldRadius;
          temporaryBall.mass = mass;
          force = calculateForce(temporaryBall, balls, selectedBallIndex);
          pinned = temporaryBall.pinned;
          hasBall = true;
        }
      } else {
        hasBallIndex = selectedBallIndex;
      }
    } else if (highlightedBallIndex !== null) {
      hasBallIndex = highlightedBallIndex;
    }
    if (hasBallIndex !== null) {
      let ball = balls[hasBallIndex];
      ballIndex = hasBallIndex.toString();
      worldRadius = ball.radius;
      mass = ball.mass;
      x = ball.center.x;
      y = ball.center.y;
      velocity = ball.velocity;
      force = calculateForce(ball, balls, hasBallIndex);
      pinned = ball.pinned;
      hasBall = true;
    }
    if (hasBall) {
      ballInfoPanel = <Stack direction="column" spacing={0}>
        {AlignedTextPair(<Italics>Index:</Italics>,
          <span>{ballIndex}</span>
        )}
        {AlignedTextPair(<Italics>Center:</Italics>, 
          <span>
            {pinned && "pinned"} ({ScientificNumberText(x, null)}, {ScientificNumberText(y, null)}) m
          </span>
        )}
        {AlignedTextPair(<Italics>Radius:</Italics>,
          ScientificNumberText(worldRadius, "m")
        )}
        {AlignedTextPair(<Italics>Mass:</Italics>,
          ScientificNumberText(mass, "kg")
        )}
        {AlignedTextPair(<Italics>Velocity:</Italics>,
          <span>
            ({ScientificNumberText(velocity.x)}, {ScientificNumberText(velocity.y)}) m/s
          </span>
        )}
        {force !== null && AlignedTextPair(<Italics>Force:</Italics>,
          <span>
            ({ScientificNumberText(force.x)}, {ScientificNumberText(force.y)}) N
          </span>
        )}
        {force !== null && AlignedTextPair(<Italics>Accel.:</Italics>,
          <span>
            ({ScientificNumberText(force.x / mass)}, {ScientificNumberText(force.y / mass)}) m/s<sup>2</sup>
          </span>
        )}
      </Stack>
    }
  }

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
          
          <Box><Paper sx={{width: "auto",  display: "inline-block"}}><Box padding={1}>
            
            {!controlState.guiHidden && <Stack direction="row" spacing={1} divider={<Divider orientation="vertical" flexItem />}>

              <Stack direction="column" spacing={1}>
                <CButton 
                  variant={(controlState.mode === "play" || controlState.mode === "pause") ? "contained" : "outlined"}
                  onClick={userGotoPlayPanel}
                  color="blue"
                >
                  play
                </CButton>
                <CButton 
                  variant={(controlState.mode === "create") ? "contained" : "outlined"}
                  onClick={userGotoCreatePanel}
                  color="green"
                >create</CButton>
                <CButton 
                  variant={(controlState.mode === "edit") ? "contained" : "outlined"}
                  onClick={userGotoEditPanel}
                  color="yellow"
                >edit</CButton>
                <CButton 
                  variant={(controlState.mode === "velocity") ? "contained" : "outlined"}
                  onClick={userGotoVelocityPanel}
                  color="red"
                >velocity</CButton>

                <CButton 
                  color="white"
                  variant={(!controlState.helpHidden) ? "contained" : "outlined"}
                  onClick={userSetHelpHidden}
                >help</CButton>

                <CButton 
                  variant={(controlState.guiHidden) ? "contained" : "outlined"}
                  onClick={() => {
                    setControlState({ ...controlState, guiHidden: !controlState.guiHidden });
                  }}
                  color="white"
                >
                  {controlState.guiHidden ? "show" : "hide"} gui
                </CButton>
                
              </Stack>

              {!controlState.helpHidden && <Stack direction="column">
                {helpItems.map((item, index) => {
                  return <BulletinText width="15rem" key={index}>{item}</BulletinText>
                })}
              </Stack>}
              
              {subcontrolsPanel}

              {ballInfoPanel}

            </Stack>}

            {controlState.guiHidden && <Box>
              <CButton 
                variant={(controlState.guiHidden) ? "contained" : "outlined"}
                onClick={userSetGuiHidden}
                color="white"
              >
                {controlState.guiHidden ? "show" : "hide"} gui
              </CButton>
            </Box>}

          </Box></Paper></Box>

        </Stack>
      </Box>
      <canvas width={clientSize.width} height={clientSize.height} ref={canvasRef} 
        onMouseDown={canvasMouseDown}
        onMouseMove={canvasMouseMove}
        onMouseUp={canvasMouseUp}
        onWheel={canvasMouseWheel}
      />
    </Box>
  </ThemeProvider>
  </>
}