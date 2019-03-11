import { expect } from 'chai'
import * as cp from 'child_process'
import * as fs from 'fs-extra'
import * as os from 'os'
import * as path from 'path'
import { clipboard, BrowserWindow, nativeImage, TouchBar, NativeImage } from 'electron';
import { AssertionError } from 'assert';
import { closeWindow } from './window-helpers';

const touchBarSimulator = path.resolve(__dirname, '../external_binaries/Touch Bar Simulator.app/Contents/MacOS/Touch Bar Simulator')
const snapPath = path.resolve(__dirname, 'touch-bar-snaps')

const EMPTY_IMAGE = 'data:image/png;base64,'

describe('TouchBar API', function () {
  let simulatorChild: cp.ChildProcess
  let w: BrowserWindow
  let waitedForBar = false

  this.timeout(30000)

  if (process.platform !== 'darwin') {
    return
  }

  beforeEach(async () => {
    simulatorChild = cp.spawn(touchBarSimulator)
    simulatorChild.stdout.on('data', (data) => console.log(data.toString()))
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
      cp.execSync('screencapture -b -x -c')
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
      const current = nativeImage.createFromPath(snapFile)
      if (Buffer.compare(current.toBitmap(), snap.toBitmap()) !== 0) {
        const tmpFile = path.resolve(await fs.mkdtemp(path.resolve(os.tmpdir(), 'electron-snap-')), `${snapName}.png`)
        await fs.writeFile(tmpFile, snap.toPNG())
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
