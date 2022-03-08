import * as THREE from 'https://unpkg.com/three@0.127.0/build/three.module.js'
// import * as Cube from './cube.js'

const size = 2
const showAxes = false

var camera, scene, renderer, whole, wrapper, time


class Coord extends THREE.Vector3 {
  // Coord is a position made of integers and size independents.
  // For example, if normal = Diversiont.negZ and coord = {0, 0, -1},
  // the position of the center of the tile is { size / 2, size / 2, -size} .
  static p000 = new Coord(0, 0, 0)
  static p001 = new Coord(0, 0, 1)
  static p010 = new Coord(0, 1, 0)
  static p100 = new Coord(1, 0, 0)
  static p011 = new Coord(0, 1, 1)
  static p101 = new Coord(1, 0, 1)
  static p110 = new Coord(1, 1, 0)
  static p111 = new Coord(1, 1, 1)
}


class Direction extends THREE.Vector3 {
  // A direction is a vector in {-1, 0, 1}^3 such that |x| + |y| + |z| = 1.
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

  opposite() {
    switch (this) {
      case Direction.posX: return Direction.negX
      case Direction.negX: return Direction.posX
      case Direction.posY: return Direction.negY
      case Direction.negY: return Direction.posY
      case Direction.posZ: return Direction.negZ
      case Direction.negZ: return Direction.posZ
    }
  }
}


class Tile extends THREE.Group {
  // One piece of wrapper that covers a single face of the cube.

  static thickness = 0.01
  static size = size * 0.99

  constructor(coord = Coord.p000, normal = Direction.negZ) {
    super()
    const geometry = new THREE.PlaneGeometry(Tile.size, Tile.size)
    const materialI = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      opacity: 0.7,
      transparent: true,
      side: THREE.DoubleSide
    })
    let inner = new THREE.Mesh(geometry, materialI)
    const materialO = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      opacity: 0.7,
      transparent: true,
      side: THREE.DoubleSide
    })
    let outer = new THREE.Mesh(geometry, materialO)
    inner.position.z += Tile.thickness / 2
    outer.position.z -= Tile.thickness / 2
    this.add(inner)
    this.add(outer)
    this.normal = new Direction(normal.x, normal.y, normal.z)
    this.coord = new Coord(coord.x, coord.y, coord.z)
    this.resetPositionFromCoord()
  }

  static positionFromCoord(coord, normal) {
    // Returns the position of the tile based on its coord.
    if (normal.x)
      return new THREE.Vector3(
        coord.x * size,
        (coord.y + 0.5) * size,
        (coord.z + 0.5) * size
      )
    if (normal.y)
      return new THREE.Vector3(
        (coord.x + 0.5) * size,
        coord.y * size,
        (coord.z + 0.5) * size
      )
    if (normal.z)
      return new THREE.Vector3(
        (coord.x + 0.5) * size,
        (coord.y + 0.5) * size,
        coord.z * size
      )
  }

  resetPositionFromCoord(coord = this.coord) {
    // Set the tile position based on its coord.
    if (this.normal.x)
      this.position.set(coord.x * size, (coord.y + 0.5) * size, (coord.z + 0.5) * size)
    else if (this.normal.y)
      this.position.set((coord.x + 0.5) * size, coord.y * size, (coord.z + 0.5) * size)
    else if (this.normal.z)
      this.position.set((coord.x + 0.5) * size, (coord.y + 0.5) * size, coord.z * size)
  }

  static coordFromPosition(position) {
    // Returns the coord of the tile based on its position.
    if (this.normal.x)
      return {
        x: Math.round(position.x / size),
        y: Math.round(position.y / size - 0.5),
        z: Math.round(position.z / size - 0.5)
      }
    if (this.normal.y)
      return {
        x: Math.round(position.x / size - 0.5),
        y: Math.round(position.y / size),
        z: Math.round(position.z / size - 0.5)
      }
    if (this.normal.z)
      return {
        x: Math.round(position.x / size - 0.5),
        y: Math.round(position.y / size - 0.5),
        z: Math.round(position.z / size)
      }
  }

  resetCoordFromPosition(position = this.position) {
    // Set the coord based on the tile position.
    if (this.normal.x)
      this.coord.set(
        Math.round(position.x / size),
        Math.round(position.y / size - 0.5),
        Math.round(position.z / size - 0.5))
    if (this.normal.y)
      this.coord.set(
        Math.round(position.x / size - 0.5),
        Math.round(position.y / size),
        Math.round(position.z / size - 0.5))
    if (this.normal.z)
      this.coord.set(
        Math.round(position.x / size - 0.5),
        Math.round(position.y / size - 0.5),
        Math.round(position.z / size))
  }

  positionTileToCoord(coord) {
    this.coord.copy(coord)
    this.resetPositionFromCoord()
  }

  translate(new_coord, step, steps) {
    if (step < 1 || step > steps)
      throw new Error('Step must be in {1, steps}')
    const p = Tile.positionFromCoord(this.coord, this.normal)
    const new_p = Tile.positionFromCoord(new_coord, this.normal)
    this.position.addVectors(p.multiplyScalar(1 - step / steps), new_p.multiplyScalar(step / steps))
    if (step == steps) {
      this.resetCoordFromPosition()
      this.resetPositionFromCoord()
    }
  }

  #rotate2D(c, a, p) {
    // Returns the new point p after a rotation of p of angle a around rotation center c.
    return [
      c[0] + (p[0] - c[0]) * Math.cos(a) - (p[1] - c[1]) * Math.sin(a),
      c[1] + (p[1] - c[1]) * Math.cos(a) + (p[0] - c[0]) * Math.sin(a)
    ]
  }

  rotate(hinge_coord, direction, positive, step, steps) {
    if (step < 1 || step > steps)
      throw new Error('Step must be in {1, steps}')
    const hinge_position = new THREE.Vector3().copy(hinge_coord).multiplyScalar(size)
    const p = this.position
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
    const theta = direction[d0] * Math.PI / 2 / steps
    const newP = this.#rotate2D(
      [hinge_position[d1], hinge_position[d2]], thetaClose * theta, [p[d1], p[d2]])

    const quaternion = new THREE.Quaternion().setFromAxisAngle(direction, -theta * thetaClose)
    this.quaternion.premultiply(quaternion)

    // this.rotation[d0] = theta + thetaClose * this.normal[d1] * Math.PI / 2
    this.position[d1] = newP[0]
    this.position[d2] = newP[1]
    if (step == steps) {
      this.normal.rotateHalfPi(direction)
      this.resetCoordFromPosition()
      this.resetPositionFromCoord()
      // this.position.copy(this.#getPosition())
      // this.position.copy(this.#getRefPosition())
    }
  }
}


class Step {
  static init = new Step(0)
  static begin = new Step(10)
  static rotate = new Step(20)
  static translate = new Step(30)
  static spin = new Step(3)
  static flip = new Step(10)
  static end = new Step(10)
  // static begin = new Step(1)
  // static rotate = new Step(1)
  // static translate = new Step(2)
  // static flip = new Step(2)
  // static spin = new Step(1)
  // static end = new Step(1)

  static flow = [
    [Step.begin],
    [Step.rotate, 0], [Step.translate, true],
    [Step.rotate, 1], [Step.flip, 0, true],
    [Step.rotate, 2], [Step.flip, 1, true],
    [Step.rotate, 3], [Step.flip, 2, true],
    [Step.rotate, 4], [Step.flip, 3, true],
    [Step.rotate, 5], [Step.flip, 4, true],
    [Step.spin],
    [Step.rotate, 5], [Step.flip, 4, false],
    [Step.rotate, 4], [Step.flip, 3, false],
    [Step.rotate, 3], [Step.flip, 2, false],
    [Step.rotate, 2], [Step.flip, 1, false],
    [Step.rotate, 1], [Step.flip, 0, false],
    [Step.rotate, 0], [Step.translate, false],
    [Step.rotate, -1],
    [Step.end]
  ]

  static totalTime = Step.init.t + Step.begin.t + Step.rotate.t * 13 + Step.translate.t * 2 +
    Step.spin.t + Step.flip.t * 10 + Step.end.t

  constructor(duration) {
    this.t = duration
  }

  static getStep(time) {
    if (time == 0) return [Step.init]
    for (const s of Step.flow) {
      if (time <= s[0].t) return s.concat([time])
      time -= s[0].t
    }
  }
}


function init() {

  time = 0
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.position.set(0, 0, 70)

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
  if (showAxes)
    scene.add(new THREE.AxesHelper(50));

  // wrapper
  wrapper = new THREE.Group()
  for (let i = 0; i < 6; i++)
    wrapper.add(new Tile())
  whole.add(wrapper)

  renderer = new THREE.WebGLRenderer({
    antialias: true
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)

  whole.scale.set(5, 5, 5)
  whole.position.set(0, 0, 0)
  whole.rotation.x = Math.PI / 2 + 0.2
  whole.rotation.y = Math.PI - 0.2
  whole.rotation.z = 0
}


function animate() {
  requestAnimationFrame(animate)

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
      [[1], Coord.p100, Direction.posY, true],
      [[2], Coord.p010, Direction.negX, false],
      [[3], Coord.p000, Direction.posY, false],
      [[4, 5], Coord.p000, Direction.negX, true],
      [[5], Coord.p001, Direction.negX, true]
    ]

    let timeStep = Step.getStep(time)
    switch (timeStep[0]) {
      case Step.init:
        for (let i = 0; i < wrapper.children.length; i++)
          wrapper.children[i].positionTileToCoord({
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
          }, timeStep[2], timeStep[0].t)
        break
      case Step.flip:
        let flip = flips[timeStep[1]]
        for (const side of flip[0])
          wrapper.children[side].rotate(
            flip[1], flip[2], flip[3] == timeStep[2], timeStep[3], timeStep[0].t)
        break
    }
  }

  function animateCube2(time) {
    const xInit = -1
    const yInit = 0
    const zInit = -1
    const sidesXY = [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, -1],
      [1, -2]
    ]
    const flips = [
      [[3, 4, 5], Coord.p100, Direction.negY, false],
      [[4, 5], Coord.p100, Direction.posZ, false],
      [[5], Coord.p000, Direction.posZ, false],
      [[1, 2], Coord.p010, Direction.posX, true],
      [[2], Coord.p011, Direction.posX, true],
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
          wrapper.children[side].rotate(
            flip[1], timeStep[2] ? flip[2] : flip[2].opposite(), flip[3], timeStep[3])
        break
    }
  }

  // let quaternion = new THREE.Quaternion()
  // // const sqrt22 = Math.sqrt(2) / 2
  // // const qxpos = new THREE.Quaternion(sqrt22, 0, 0, sqrt22)
  // // const qypos = new THREE.Quaternion(0, sqrt22, 0, sqrt22)
  // // const qzpos = new THREE.Quaternion(0, 0, sqrt22, sqrt22)
  // const animateCubes = [animateCube2]  //, animateCube2]
  // // animateCubes[Math.floor((time % (animateCubes.length * Step.totalTime)) / Step.totalTime)](time % Step.totalTime)
  // if (time <= 1) {
  //   wrapper.children[0].position.set(0, 0, -1)
  // } else if (time <= 3) {
  //   // wrapper.children[0].rotation.set(1, 0, 0)
  //   // wrapper.children[0].quaternion.rotateTowards(qxpos, 0.075 * time)
  //   // wrapper.children[0].quaternion.premultiply(qxpos)
  //   quaternion.setFromAxisAngle(Direction.posX, Math.PI / 4);
  //   wrapper.children[0].quaternion.premultiply(quaternion)
  // } else if (time <= 5) {
  //   // wrapper.children[0].quaternion.rotateTowards(qzpos, 0.075 * time)
  //   // wrapper.children[0].quaternion.premultiply(qzpos)
  //   // const current = wrapper.children[0].quaternion.clone()
  //   // wrapper.children[0].quaternion.copy(qzpos)
  //   // wrapper.children[0].quaternion.multiply(current)
  //   // wrapper.children[0].quaternion.multiplyQuaternions(qzpos, qxpos)
  //   quaternion.setFromAxisAngle(Direction.posZ, Math.PI / 4);
  //   wrapper.children[0].quaternion.premultiply(quaternion)
  // } else if (time <= 7) {
  //   // wrapper.children[0].quaternion.rotateTowards(qzpos, 0.075 * time)
  //   // const current = wrapper.children[0].quaternion.clone()
  //   // wrapper.children[0].quaternion.copy(qypos)
  //   // wrapper.children[0].quaternion.multiply(current)
  //   // wrapper.children[0].quaternion.premultiply(qypos)
  //   quaternion.setFromAxisAngle(Direction.posY, Math.PI / 4);
  //   wrapper.children[0].quaternion.premultiply(quaternion)
  // } else if (time <= 9) {
  //   // wrapper.children[0].rotation.set(1, 0, 0)
  //   // wrapper.children[0].quaternion.rotateTowards(qxpos, 0.075 * time)
  //   // const current = wrapper.children[0].quaternion.clone()
  //   // wrapper.children[0].quaternion.copy(qxpos)
  //   // wrapper.children[0].quaternion.multiply(current)
  //   // wrapper.children[0].quaternion.premultiply(qxpos)
  //   quaternion.setFromAxisAngle(Direction.posX, Math.PI / 4);
  //   wrapper.children[0].quaternion.premultiply(quaternion)
  // }
  // // wrapper.children[0].quaternion.multiply(new THREE.Quaternion(sqrt22, 0, 0, sqrt22))
  // // else if (time==2)
  // //   wrapper.children[0].quaternion.multiply(new THREE.Quaternion(0, sqrt22, 0, sqrt22))
  // // else if (time==3)
  // //   wrapper.children[0].quaternion.multiply(new THREE.Quaternion(0, 0, sqrt22, sqrt22))

  if (time % (2 * Step.totalTime) < Step.totalTime)
    animateCube1(time % Step.totalTime)
  // else
  //   animateCube2(time % Step.totalTime)

  // whole.rotation.x = rotationX + 0.02
  // whole.rotation.y = rotationY + 0.01

  renderer.render(scene, camera)
  time += 1



}


init()
requestAnimationFrame(animate)
