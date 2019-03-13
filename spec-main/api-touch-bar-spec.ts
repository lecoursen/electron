import { expect } from 'chai'
import * as cp from 'child_process'
import * as fs from 'fs-extra'
import * as os from 'os'
import * as path from 'path'
import * as semver from 'semver'
import { clipboard, BrowserWindow, nativeImage, TouchBar, NativeImage } from 'electron';
import { AssertionError } from 'assert';
import { closeWindow } from './window-helpers';

const looksSame = require('looks-same')

const touchBarSimulator = path.resolve(__dirname, '../external_binaries/Touché.app/Contents/MacOS/Touché')
const snapPath = path.resolve(__dirname, 'touch-bar-snaps')

const EMPTY_IMAGE = 'data:image/png;base64,'

describe('TouchBar API', function () {
  let simulatorChild: cp.ChildProcess
  let w: BrowserWindow
  let waitedForBar = false
  let tmpFolder: string;

  this.timeout(30000)

  if (process.platform !== 'darwin' || !fs.pathExistsSync(touchBarSimulator) || semver.lt(os.release(), '17.0.0')) {
    return
  }

  before(async () => {
    // Ensure that the touch simulator does not prompt for prefs on launch
    cp.execSync('defaults write com.red-sweater.touche SUEnableAutomaticChecks 0')
    cp.execSync('defaults write com.red-sweater.touche SUSendProfileInfo 0')
    // Set the global shortcut binding
    cp.execSync('defaults write com.red-sweater.touche PasteboardScreenshotShortcut "<62706c69 73743030 d4010203 0405061a 1b582476 65727369 6f6e5824 6f626a65 63747359 24617263 68697665 72542474 6f701200 0186a0a3 07080f55 246e756c 6cd3090a 0b0c0d0e 52243152 24305624 636c6173 73111300 10018002 d3101112 1314185a 24636c61 73736e61 6d655824 636c6173 7365735b 24636c61 73736869 6e74735d 5253486f 744b6579 436f6d62 6fa31516 175d5253 486f744b 6579436f 6d626f5f 10135253 436f6e74 61696e61 626c654f 626a6563 74584e53 4f626a65 6374a119 5b486f74 4b657943 6f6d626f 5f100f4e 534b6579 65644172 63686976 6572d11c 1d54726f 6f748001 08111a23 2d32373b 41484b4e 55585a5c 636e7783 9195a3b9 c2c4d0e2 e5ea0000 00000000 01010000 00000000 001e0000 00000000 00000000 00000000 00ec>"')

    tmpFolder = process.env.ELECTRON_SPEC_SNAP_FOLDER || await fs.mkdtemp(path.resolve(os.tmpdir(), 'electron-snap-'))
    await fs.mkdirp(tmpFolder)
  })

  beforeEach(async () => {
    simulatorChild = cp.spawn(touchBarSimulator)
    simulatorChild.stdout.on('data', (data) => console.log(data.toString()))
    await new Promise(r => setTimeout(r, 400))
    await takeScreenshot(true)
    w = new BrowserWindow()
    w.focus()
    waitedForBar = false
  })

  afterEach(() => {
    simulatorChild.kill()
    closeWindow(w).then(() => { w = null as any })
  })

  const takeScreenshot = async (instant?: boolean): Promise<NativeImage> => {
    if (!instant) {
      // Fade in for touch bar is about 1000ms
      if (!waitedForBar) {
        await new Promise(r => setTimeout(r, 1500))
      } else {
        await new Promise(r => setTimeout(r, 400))
      }
      waitedForBar = true
    }
    clipboard.writeText('')
    while (clipboard.readImage().toDataURL() === EMPTY_IMAGE) {
      await new Promise(r => setTimeout(r, 50))
      try {
        cp.execSync('screencapture -b -x -c')
      } catch {
        // Ignore, the Touch Bar is not ready yet
      }
    }
    const bar = clipboard.readImage()
    const size = bar.getSize()
    // Clone image to remove strange nativeImage artifacts
    return nativeImage.createFromBuffer(bar.crop({
      x: 0,
      y: 0,
      height: size.height,
      width: size.width - 620
    }).toPNG())
  }

  const assertSnap = async (test: Mocha.Context, name = 'snap') => {
    const snap = await takeScreenshot()

    const snapName = `${test.test!.title}-${name}`.replace(/[ ':\/\\]/gi, '-')
    const snapFile = path.resolve(snapPath, `${snapName}.png`)
    if (!await fs.pathExists(snapFile) || process.argv.includes('--update-snaps')) {
      await fs.writeFile(snapFile, snap.toPNG())
    } else {
      const tmpFile = path.resolve(tmpFolder, `${snapName}.png`)
      await fs.writeFile(tmpFile, snap.toPNG())

      const equal = await new Promise<boolean>((resolve, reject) => {
        looksSame(tmpFile, snapFile, { ignoreAntialiasing: true, tolerance: 5 }, (error: Error | null, { equal }: { equal: boolean}) => {
          if (error) return reject(error)
          resolve(equal)
        })
      })

      if (!equal) {
        throw new AssertionError({
          message: `Expected snapshot "${snapName}" to be identical to the one on disk, but it was not.  Check ${tmpFile} for the output`
        })
      }
    }
  }

  it('the tests should be able to screenshot the touchbar', async () => {
    expect((await takeScreenshot()).toDataURL()).to.not.equal(EMPTY_IMAGE)
  })

  it('should initially be empty', async function () {
    await assertSnap(this)
  })

  it('should create a button with a label', async function () {
    const bar = new TouchBar({
      items: [
        new TouchBar.TouchBarButton({
          label: 'Hello'
        })
      ]
    })
    w.setTouchBar(bar)
    await assertSnap(this)
  })

  it('should allow button labels to be updated dynamically', async function () {
    const button = new TouchBar.TouchBarButton({
      label: 'Hello'
    })
    const bar = new TouchBar({
      items: [
        button
      ]
    })
    w.setTouchBar(bar)
    await assertSnap(this, 'before')
    button.label = 'changed'
    await assertSnap(this, 'after')
  })

  it('should create sliders and programatically update them', async function () {
    const slider = new TouchBar.TouchBarSlider({
      label: 'I am a Slider',
      minValue: 0,
      maxValue: 100,
      value: 20
    })
    const bar = new TouchBar({
      items: [
        slider
      ]
    })
    w.setTouchBar(bar)
    await assertSnap(this, 'created')
    slider.value = 80
    await assertSnap(this, 'updated')
  })

  it('should create color pickers', async function () {
    const colorPicker = new TouchBar.TouchBarColorPicker({
      selectedColor: '#FF0000'
    })
    const bar = new TouchBar({
      items: [
        colorPicker
      ]
    })
    w.setTouchBar(bar)
    await assertSnap(this)
  })

  it('should create button groups with a single button in them', async function () {
    const group = new TouchBar.TouchBarGroup({
      items: new TouchBar({
        items: [
          new TouchBar.TouchBarButton({
            label: 'first'
          })
        ]
      })
    })
    const bar = new TouchBar({
      items: [
        group
      ]
    })
    w.setTouchBar(bar)
    await assertSnap(this)
  })

  it('should create button groups with a multiple button in them', async function () {
    const group = new TouchBar.TouchBarGroup({
      items: new TouchBar({
        items: [
          new TouchBar.TouchBarButton({
            label: 'start'
          }),
          new TouchBar.TouchBarButton({
            label: 'middle'
          }),
          new TouchBar.TouchBarButton({
            label: 'another-middle'
          }),
          new TouchBar.TouchBarButton({
            label: 'end'
          })
        ]
      })
    })
    const bar = new TouchBar({
      items: [
        group
      ]
    })
    w.setTouchBar(bar)
    await assertSnap(this)
  })

  it('should create appropriately separated buttons when not in a group', async function () {
    const bar = new TouchBar({
      items: [
        new TouchBar.TouchBarButton({
          label: 'first'
        }),
        new TouchBar.TouchBarButton({
          label: 'second'
        }),
        new TouchBar.TouchBarButton({
          label: 'third'
        }),
      ]
    })
    w.setTouchBar(bar)
    await assertSnap(this)
  })

  it('should create segmented controls with labels', async function () {
    const bar = new TouchBar({
      items: [
        new TouchBar.TouchBarSegmentedControl({
          segments: [{
            label: 'Example First'
          }, {
            label: 'Example Second'
          }],
          change: () => null
        }),
      ]
    })
    w.setTouchBar(bar)
    await assertSnap(this)
  })

  it('should create segmented controls with images', async function () {
    const bar = new TouchBar({
      items: [
        new TouchBar.TouchBarSegmentedControl({
          segments: [{
            icon: nativeImage.createFromNamedImage('NSCaution', undefined as any)
          }, {
            icon: nativeImage.createFromNamedImage('NSFontPanel', undefined as any)
          }],
          change: () => null
        }),
      ]
    })
    w.setTouchBar(bar)
    await assertSnap(this)
  })

  it('should allow segmented controls to be programatically updated', async function () {
    const control = new TouchBar.TouchBarSegmentedControl({
      segments: [{
        label: 'Example First'
      }, {
        label: 'Example Second'
      }],
      change: () => null
    })
    const bar = new TouchBar({
      items: [
        control,
      ]
    })
    w.setTouchBar(bar)
    await assertSnap(this, 'before')
    control.selectedIndex = 1
    await assertSnap(this, 'after')
  })
})
