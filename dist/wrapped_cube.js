import * as THREE from 'https://unpkg.com/three@0.127.0/build/three.module.js';

const size = 10
const showingOrigin = false

var camera, scene, renderer, whole, wrapper, time

class CubePosition extends THREE.Vector3 {
  static p000 = new CubePosition(0, 0, 0)
  static p001 = new CubePosition(0, 0, 1)
  static p010 = new CubePosition(0, 1, 0)
  static p100 = new CubePosition(1, 0, 0)
}
/* Used for the discrete cubePositioninate system. */

class Direction extends THREE.Vector3 {
  /* A direction is a vector in {-1, 0, 1}^3 such that |x| + |y| + |z| = 1. */
  static posX = new Direction(1, 0, 0)
  static negX = new Direction(-1, 0, 0)
  static posY = new Direction(0, 1, 0)
  static negY = new Direction(0, -1, 0)
  static posZ = new Direction(0, 0, 1)
  static negZ = new Direction(0, 0, -1)

  constructor(x, y, z) {
    if (Math.abs(x) + Math.abs(y) + Math.abs(z) != 1 || x * y != 0 || x * z != 0 || y * z != 0)
      throw new Error('Invalid direction.')
    super(x, y, z)
  }

  rotateHalfPi(direction) {
    if (direction.x) {
      if (this.y) {
        this.z = direction.x * this.y
        this.y = 0
      } else if (this.z) {
        this.y = -direction.x * this.z
        this.z = 0
      }
    } else if (direction.y) {
      if (this.x) {
        this.z = -direction.y * this.x
        this.x = 0
      } else if (this.z) {
        this.x = direction.y * this.z
        this.z = 0
      }
    } else if (direction.z) {
      if (this.x) {
        this.y = direction.z * this.x
        this.x = 0
      } else if (this.y) {
        this.x = -direction.z * this.y
        this.y = 0
      }
    }
  }
}

class CubeWrapperSide extends THREE.Group {
  /*
  One piece of wrapper that covers a single face of the cube.
  */

  static thickness = 0.01
  static size = size * 0.99

  constructor(
    cubePosition = new CubePosition(0, 0, 0),
    normal = new Direction(0, 0, -1)) {
    super()
    const geometry = new THREE.PlaneGeometry(CubeWrapperSide.size, CubeWrapperSide.size)
    const materialI = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      side: THREE.DoubleSide
    })
    let inner = new THREE.Mesh(geometry, materialI)
    const materialO = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      side: THREE.DoubleSide
    })
    let outer = new THREE.Mesh(geometry, materialO)
    inner.position.z += CubeWrapperSide.thickness / 2
    outer.position.z -= CubeWrapperSide.thickness / 2
    this.add(inner)
    this.add(outer)
    this.normal = normal
    this.setOrientation(normal)
    this.cubePosition = cubePosition
    this.setPosition(cubePosition)
  }

  #getRefPosition(cubePosition = this.cubePosition) {
    /* Returns what this.position should be based on cubePosition. */
    if (this.normal.x)
      return {
        x: cubePosition.x * size,
        y: (cubePosition.y + 0.5) * size,
        z: (cubePosition.z + 0.5) * size
      }
    if (this.normal.y)
      return {
        x: (cubePosition.x + 0.5) * size,
        y: cubePosition.y * size,
        z: (cubePosition.z + 0.5) * size
      }
    if (this.normal.z)
      return {
        x: (cubePosition.x + 0.5) * size,
        y: (cubePosition.y + 0.5) * size,
        z: cubePosition.z * size
      }
  }

  #getCubePosition() {
    /* Returns cubePosition based on the this.position. */
    if (this.normal.x)
      return {
        x: Math.round(this.position.x / size),
        y: Math.round(this.position.y / size - 0.5),
        z: Math.round(this.position.z / size - 0.5)
      }
    if (this.normal.y)
      return {
        x: Math.round(this.position.x / size - 0.5),
        y: Math.round(this.position.y / size),
        z: Math.round(this.position.z / size - 0.5)
      }
    if (this.normal.z)
      return {
        x: Math.round(this.position.x / size - 0.5),
        y: Math.round(this.position.y / size - 0.5),
        z: Math.round(this.position.z / size)
      }
  }

  setOrientation(normal = null) {
    if (normal)
      this.normal.copy(normal)
    const pi_2 = Math.PI / 2
    this.rotation.set(this.normal.x * pi_2, this.normal.y * pi_2, this.normal.z * pi_2)
  }

  setPosition(cubePosition = null) {
    if (cubePosition)
      this.cubePosition.copy(cubePosition)
    this.position.copy(this.#getRefPosition())
  }

  translate(cubePosition, rate = 1.0) {
    if (rate < 0 || rate > 1)
      throw new Error('Rate must be in [0, 1]')
    const p = new THREE.Vector3().copy(this.#getRefPosition())
    const new_p = new THREE.Vector3().copy(this.#getRefPosition(cubePosition))
    this.position.addVectors(p.multiplyScalar(1 - rate), new_p.multiplyScalar(rate))
    if (rate >= 1) {
      this.cubePosition.copy(cubePosition)
    }
  }

  #rotate(c, a, p) {
    /* Returns the new point p after a rotation of p of angle a around center c. */
    return [
      c[0] + (p[0] - c[0]) * Math.cos(a) - (p[1] - c[1]) * Math.sin(a),
      c[1] + (p[1] - c[1]) * Math.cos(a) + (p[0] - c[0]) * Math.sin(a)
    ]
  }

  rotate(axis, direction, positive, rate = 1.0) {
    if (rate < 0 || rate > 1)
      throw new Error('Rate must be in [0, 1]')
    const center = new THREE.Vector3().copy(axis).multiplyScalar(size)
    const p = this.#getRefPosition()
    let d0, d1, d2
    if (direction.x) {
      d0 = 'x'
      d1 = 'y'
      d2 = 'z'
    } else if (direction.y) {
      d0 = 'y'
      d1 = 'x'
      d2 = 'z'
    } else if (direction.z) {
      d0 = 'z'
      d1 = 'x'
      d2 = 'y'
    }
    const thetaClose = 2 * positive - 1
    const theta = direction[d0] * Math.PI / 2 * rate
    const newP = this.#rotate([center[d1], center[d2]], thetaClose * theta, [p[d1], p[d2]])
    this.rotation[d0] = theta + thetaClose * this.normal[d1] * Math.PI / 2
    this.position[d1] = newP[0]
    this.position[d2] = newP[1]
    if (rate >= 1) {
      this.normal.rotateHalfPi(direction)
      this.cubePosition.copy(this.#getCubePosition())
      this.position.copy(this.#getRefPosition())
    }
  }
}

class Step {
  // start + translate + [pause + flip] * 5 + done + [flip + pause] * 5 + translate + end
  static init = new Step(0)
  static start = new Step(10)
  static translate = new Step(10)
  static pause = new Step(3)
  static flip = new Step(10)
  static done = new Step(20)
  static end = new Step(10)
  static sleep = new Step(0)

  static totalTime = Step.start.t + Step.translate.t * 2 + (Step.pause.t +
                     Step.flip.t) * 10 + Step.done.t + Step.end.t

  constructor(duration) {
    this.t = duration
  }

  static getStep(time) {
    if (time == 0) return [Step.init]
    if (time <= Step.start.t) return [Step.sleep]
    time -= Step.start.t
    if (time <= Step.translate.t) return [Step.translate, true, time / Step.translate.t]
    time -= Step.translate.t
    if (time <= 5 * (Step.pause.t + Step.flip.t)) {
      let div = Math.floor((time - 1) / (Step.pause.t + Step.flip.t))
      let rem = (time - 1) % (Step.pause.t + Step.flip.t) + 1
      if (rem <= Step.pause.t) return [Step.sleep]
      return [Step.flip, div, true, (rem - Step.pause.t) / Step.flip.t]
    }
    time -= 5 * (Step.pause.t + Step.flip.t)
    if (time <= Step.done.t) return [Step.sleep]
    time -= Step.done.t
    if (time <= 5 * (Step.pause.t + Step.flip.t)) {
      let div = Math.floor((time - 1) / (Step.pause.t + Step.flip.t))
      let rem = (time - 1) % (Step.pause.t + Step.flip.t) + 1
      if (rem <= Step.flip.t) return [Step.flip, 4 - div, false, rem / Step.flip.t]
      return [Step.sleep]
    }
    time -= 5 * (Step.pause.t + Step.flip.t)
    if (time <= Step.translate.t) return [Step.translate, false, time / Step.translate.t]
    return [Step.sleep]
  }
}

function init() {

  time = 0
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.position.z = 50

  scene = new THREE.Scene()
  whole = new THREE.Group()
  scene.add(whole)

  // volume
  const shrink = 0.99
  let geometry = new THREE.BoxGeometry(size * shrink, size * shrink, size * shrink)
  let material = new THREE.MeshNormalMaterial()
  let volume = new THREE.Mesh(geometry, material)
  volume.position.set(size / 2, size / 2, size / 2)
  whole.add(volume)
  if (showingOrigin)
    whole.add(new THREE.Mesh(new THREE.BoxGeometry(.3, .3, .3), material))

  // wrapper
  wrapper = new THREE.Group()
  for (let i = 0; i < 6; i++)
    wrapper.add(new CubeWrapperSide())
  whole.add(wrapper)

  renderer = new THREE.WebGLRenderer({
    antialias: true
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)

  // whole.rotation.x = -1.2
  // whole.rotation.z = -1.9
  // whole.rotation.y =0
}


function animate() {
  const rotationX = whole.rotation.x
  const rotationY = whole.rotation.y
  whole.rotation.x = 0
  whole.rotation.y = 0

  function animateCube1(time) {
    const xInit = -1
    const yInit = 0
    const zInit = -1
    const sidesXY = [
      [0, 0],
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
      [0, -2]
    ]
    const flips = [
      [[1], CubePosition.p100, Direction.negY, Direction.posY, false],
      [[2], CubePosition.p010, Direction.posX, Direction.negX, true],
      [[3], CubePosition.p000, Direction.posY, Direction.negY, false],
      [[4, 5], CubePosition.p000, Direction.negX, Direction.posX, true],
      [[5], CubePosition.p001, Direction.negX, Direction.posX, true]
    ]

    let timeStep = Step.getStep(time)
    switch (timeStep[0]) {
      case Step.init:
        for (let i = 0; i < wrapper.children.length; i++)
          wrapper.children[i].setPosition({
            x: sidesXY[i][0] + xInit,
            y: sidesXY[i][1] + yInit,
            z: zInit
          })
        break
      case Step.translate:
        for (let i = 0; i < wrapper.children.length; i++)
          wrapper.children[i].translate({
            x: sidesXY[i][0] + (timeStep[1] ? 0 : xInit),
            y: sidesXY[i][1] + (timeStep[1] ? 0 : yInit),
            z: timeStep[1] ? 0 : zInit
          }, timeStep[2])
        break
      case Step.flip:
        let flip = flips[timeStep[1]]
        for (const side of flip[0])
          wrapper.children[side].rotate(flip[1], timeStep[2] ? flip[2] : flip[3], flip[4],
                                        timeStep[3])
        break
    }
  }

  animateCube1(time)

  whole.rotation.x = rotationX + 0.02
  whole.rotation.y = rotationY + 0.01

  renderer.render(scene, camera)
  time = (time + 1) % Step.totalTime

  requestAnimationFrame(animate)


}


// Main

init()
requestAnimationFrame(animate)
