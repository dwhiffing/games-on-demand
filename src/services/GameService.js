import ArrowService from './ArrowService'
import TileService from './TileService'
import MatchService from './MatchService'
import Menu from '../sprites/Menu'
import UIService from './UIService'
import InstructionsService from './InstructionsService'
import DamageService from './DamageService'

export default class GameService {
  constructor (state) {
    this.game = window.game
    this.removedTiles = []
    this.visited = []
    this.state = state
    this.hapticsEnabled = true
    this.level = 1

    this.menus = {
      1: { title: 'Blue' },
      11: { title: 'Purple' },
      21: { title: 'Green' }
    }

    this.allowInput = this.allowInput.bind(this)
    this.game.input.onDown.add(this.onPress, this)
    this.game.gameService = this

    this.uiService = new UIService()
    this.tileService = new TileService(this, this.level)

    this.damageService = new DamageService(this)

    this.uiService.init(this)

    this.matchService = new MatchService(this)
    this.arrowService = new ArrowService(this)

    this.loseMenu = new Menu({ game: this.game, type: 'lose-menu' })
    this.winMenu = new Menu({ game: this.game, type: 'win-menu' })

    this.instructionsService = new InstructionsService(this)

    this.instructionsService.show().then(() => {
      this.instructionsService.destroy()
    })

    this.restartLevel()
  }

  onPress ({ position }) {
    const tileSelected = this.matchService.selectTile(position)
    if (tileSelected) {
      this.game.input.onDown.remove(this.onPress, this)
      this.game.input.onUp.add(this.onRelease, this)
      this.game.input.addMoveCallback(this.onMove, this)
    }
  }

  onMove ({ position }) {
    this.matchService.selectTile(position)
    this.arrowService.update(position, this.matchService.getTilesInMatch())
  }

  onRelease () {
    this.game.input.onUp.remove(this.onRelease, this)
    this.game.input.deleteMoveCallback(this.onMove, this)

    this.arrowService.clear()

    const match = this.matchService.resolveMatch()
    if (match) {
      this.doSpread()
    }
    this.matchService.clearPath()
    this.allowInput()
  }

  doSpread () {
    if (this.hasLost) {
      return
    }

    this.tileService.spreadCancer(this.autoPlay)

    if (this.tileService.numMalignantRemaining() === 0) {
      this.winMenu.show().then(() => {
        setTimeout(() => {
          this.nextLevel()
        }, 500)
      })
      return
    }

    if (this.autoPlay || this.tileService.numMatchesRemaining() === 0) {
      this.autoPlay = true
      this.timeout = setTimeout(this.doSpread.bind(this), 150)
    }
  }

  allowInput () {
    this.hasLost = false
    if (!this.game.input.onDown.has(this.onPress, this)) {
      this.game.input.onDown.add(this.onPress, this)
    }
  }

  loseCondition () {
    this.hasLost = true
    this.vibrate(500)
    clearTimeout(this.timeout)
    this.loseMenu.show().then(() => {
      setTimeout(() => {
        this.restartLevel()
      }, 500)
    })
  }

  restartLevel () {
    this.autoPlay = false
    this.game.input.onUp.remove(this.onRelease, this)
    this.game.input.deleteMoveCallback(this.onMove, this)

    this.allowInput()

    if (this.level < 1) {
      this.level = 1
    }
    if (this.level > window.numLevels) {
      this.game.state.start('Menu')
    } else {
      this.tileService.loadLevel(this.level)
    }
    this.game.world.bringToTop(this.arrowService.group)
    this.game.world.bringToTop(this.arrowService.damageText)
    this.game.world.bringToTop(this.winMenu.group)
    this.game.world.bringToTop(this.loseMenu.group)
  }

  nextLevel () {
    this.level++
    this.restartLevel()
  }

  prevLevel () {
    this.level--
    this.restartLevel()
  }

  vibrate (n) {
    if (this.hapticsEnabled) {
      navigator.vibrate && navigator.vibrate(n)
    }
  }
}
