/* ═══════════════════════════════════════════════
   STORY ENGINE — engine.js
   Core logic: loads story JSON, evaluates
   conditions, applies modifiers, renders scenes.
   ═══════════════════════════════════════════════ */

/* ──────────────────────────────────────────────
   STORY ENGINE CLASS
   ────────────────────────────────────────────── */
class StoryEngine {
  constructor() {
    // DOM references
    this.sceneBg      = document.getElementById('sceneBg');
    this.sceneCard    = document.getElementById('sceneCard');
    this.sceneText    = document.getElementById('sceneText');
    this.choicesPanel = document.getElementById('choicesPanel');
    this.hud          = document.getElementById('playerHUD');
    this.navTitle     = document.getElementById('navTitle');

    // All known effect CSS classes
    this._allFxClasses = [
      'fx-shake', 'fx-flash', 'fx-flash_red', 'fx-flash_white',
      'fx-glitch', 'fx-pulse_glow', 'fx-rumble', 'fx-vignette',
      'fx-blur', 'fx-zoom_in'
    ];

    // State
    this.storyData    = null;
    this.scenesMap    = {};
    this.playerState  = {};
    this.initialState = {};
    this.currentScene = null;

    // Playthrough tracking
    this._currentPath = [];

    // Typewriter timer reference
    this._typewriterTimer = null;
  }

  /* ──────────────────────────────────────────────
     LOAD & INIT
     ────────────────────────────────────────────── */
  loadStory(json) {
    if (typeof json === 'string') {
      json = JSON.parse(json);
    }
    this.storyData = json;

    // Apply theme
    document.body.className = '';
    document.body.classList.add('theme-' + (json.global_theme || 'medieval'));

    // Title
    document.title = json.story_title || 'Story Engine';
    this.navTitle.textContent = json.story_title || 'Story Engine';

    // Cache scenes by ID for quick lookup
    this.scenesMap = {};
    for (var i = 0; i < json.scenes.length; i++) {
      this.scenesMap[json.scenes[i].id] = json.scenes[i];
    }

    // Copy initial state
    this.initialState = JSON.parse(JSON.stringify(json.player_state || {}));
    this.playerState  = JSON.parse(JSON.stringify(this.initialState));

    // Reset path tracking
    this._currentPath = [];

    // Go to first scene
    if (json.scenes && json.scenes.length > 0) {
      this.goToScene(json.scenes[0].id);
    }
  }

  restart() {
    // Record the playthrough before restarting
    if (this._currentPath.length > 0) {
      this._recordPlaythrough();
    }
    this.playerState = JSON.parse(JSON.stringify(this.initialState));
    this._currentPath = [];
    if (this.storyData.scenes && this.storyData.scenes.length > 0) {
      this.goToScene(this.storyData.scenes[0].id);
    }
  }

  /* ──────────────────────────────────────────────
     SCENE RENDERING
     ────────────────────────────────────────────── */
  goToScene(id) {
    var scene = this.scenesMap[id];
    if (!scene) {
      console.log('Scene not found:', id);
      return;
    }
    this.currentScene = scene;

    // Track this scene in the path
    this._currentPath.push({ sceneId: id, timestamp: Date.now() });

    // Background image
    this.sceneBg.className = 'scene-bg';
    if (scene.background_image && scene.background_image !== 'none') {
      this.sceneBg.classList.add('bg-' + scene.background_image);
    }

    // Visual effect
    for (var i = 0; i < this._allFxClasses.length; i++) {
      this.sceneCard.classList.remove(this._allFxClasses[i]);
    }
    if (scene.visual_effect && scene.visual_effect !== 'none') {
      this.sceneCard.classList.add('fx-' + scene.visual_effect);
    }

    // Update text with typewriter effect
    this.sceneCard.style.animation = 'none';
    this.sceneCard.offsetWidth;  // force reflow
    this.sceneCard.style.animation = '';

    // Clear any previous typewriter timer
    if (this._typewriterTimer) {
      clearInterval(this._typewriterTimer);
      this._typewriterTimer = null;
    }

    // Typewriter: split text into chars, append one by one
    var chars = scene.text.split('');
    var charIndex = 0;
    this.sceneText.textContent = '';
    var self = this;
    this._typewriterTimer = setInterval(function() {
      if (charIndex < chars.length) {
        self.sceneText.textContent += chars[charIndex];
        charIndex++;
      } else {
        clearInterval(self._typewriterTimer);
        self._typewriterTimer = null;
      }
    }, 4);

    // Render choices
    this.renderChoices(scene.choices || []);

    // Update HUD
    this.updateHUD();

    // Check if this is an ending (no available choices)
    var available = this._getAvailableChoices(scene.choices || []);
    if (available.length === 0 && this._currentPath.length > 1) {
      this._recordPlaythrough();
    }
  }

  /* ──────────────────────────────────────────────
     CHOICES
     ────────────────────────────────────────────── */
  _getAvailableChoices(choices) {
    var available = [];
    for (var i = 0; i < choices.length; i++) {
      var c = choices[i];
      if (!c.condition || c.condition.trim() === '') {
        available.push(c);
      } else if (this.evaluateCondition(c.condition)) {
        available.push(c);
      }
    }
    return available;
  }

  renderChoices(choices) {
    this.choicesPanel.innerHTML = '';
    var available = this._getAvailableChoices(choices);

    if (available.length === 0) {
      var end = document.createElement('div');
      end.className = 'end-message';
      end.textContent = '— The story ends here. —';
      this.choicesPanel.appendChild(end);
      return;
    }

    var self = this;
    for (var i = 0; i < available.length; i++) {
      (function(choice, index) {
        var btn = document.createElement('button');
        btn.className = 'choice-btn choice-cascade';
        btn.textContent = choice.text;
        btn.style.animationDelay = (index * 0.1) + 's';
        btn.addEventListener('click', function() {
          // Record choice text in path
          if (self._currentPath.length > 0) {
            self._currentPath[self._currentPath.length - 1].choiceText = choice.text;
          }
          // Apply modifier if any
          if (choice.modifier && choice.modifier.trim() !== '') {
            self.applyModifier(choice.modifier);
          }
          self.goToScene(choice.target_scene_id);
        });
        self.choicesPanel.appendChild(btn);
      })(available[i], i);
    }
  }

  /* ──────────────────────────────────────────────
     HUD — displays player variables
     ────────────────────────────────────────────── */
  updateHUD() {
    this.hud.innerHTML = '';

    // Custom hover descriptions for known stats
    var statDescriptions = {
      'gold':       'Currency used for trading in Ashenvale',
      'has_sword':  'A standard iron shortsword',
      'reputation': 'Your standing among the locals',
      'has_key':    'A tarnished brass key from the hooded stranger',
      'health':     'Your remaining life force',
      'has_shield': 'A wooden shield for basic protection'
    };

    var keys = Object.keys(this.playerState);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var val = this.playerState[key];
      var badge = document.createElement('span');
      badge.className = 'hud-badge';

      // Stat tooltip: use custom description if available, else fallback
      if (statDescriptions[key]) {
        badge.title = statDescriptions[key];
      } else {
        badge.title = 'Current value of ' + key.replace(/_/g, ' ');
      }

      // Format display value
      var display;
      if (typeof val === 'boolean') {
        display = val ? '✔' : '✘';
      } else {
        display = String(val);
      }

      // Format key name (replace underscores, capitalize)
      var label = key.replace(/_/g, ' ').toUpperCase();
      badge.innerHTML = label + ': <span class="hud-val">' + display + '</span>';
      this.hud.appendChild(badge);
    }
  }

  /* ──────────────────────────────────────────────
     CONDITION EVALUATOR
     Handles one simple condition like:
       "gold >= 10" or "has_sword == true"
     Uses string splitting instead of a tokenizer.
     ────────────────────────────────────────────── */
  evaluateCondition(condStr) {
    condStr = condStr.trim();
    if (condStr === '') return true;

    // Split by space: ["gold", ">=", "10"]
    var parts = condStr.split(' ');
    if (parts.length < 3) return false;

    var varName  = parts[0];
    var operator = parts[1];
    var rawValue = parts[2];

    // Get the current value of the variable
    var currentVal = this.playerState[varName];
    if (currentVal === undefined) return false;

    // Parse the comparison value
    var compareVal;
    if (rawValue === 'true') {
      compareVal = true;
    } else if (rawValue === 'false') {
      compareVal = false;
    } else if (!isNaN(Number(rawValue))) {
      compareVal = Number(rawValue);
    } else {
      compareVal = rawValue;
    }

    // Evaluate using simple if/else
    if (operator === '==') {
      return currentVal == compareVal;
    } else if (operator === '!=') {
      return currentVal != compareVal;
    } else if (operator === '>=') {
      return currentVal >= compareVal;
    } else if (operator === '<=') {
      return currentVal <= compareVal;
    } else if (operator === '>') {
      return currentVal > compareVal;
    } else if (operator === '<') {
      return currentVal < compareVal;
    }

    return false;
  }

  /* ──────────────────────────────────────────────
     MODIFIER APPLIER
     Handles statements separated by ;
     Each: "key = value" or "key += num" or "key -= num"
     ────────────────────────────────────────────── */
  applyModifier(modStr) {
    var statements = modStr.split(';');

    for (var i = 0; i < statements.length; i++) {
      var stmt = statements[i].trim();
      if (stmt === '') continue;

      // Check for += 
      if (stmt.indexOf('+=') !== -1) {
        var parts = stmt.split('+=');
        var key = parts[0].trim();
        var val = Number(parts[1].trim());
        if (this.playerState.hasOwnProperty(key)) {
          this.playerState[key] = Number(this.playerState[key]) + val;
        }
        // Loot notification: "Gained X key"
        var label = key.replace('_', ' ');
        this._showNotification('Gained ' + val + ' ' + label, 'gain');
      }
      // Check for -=
      else if (stmt.indexOf('-=') !== -1) {
        var parts = stmt.split('-=');
        var key = parts[0].trim();
        var val = Number(parts[1].trim());
        if (this.playerState.hasOwnProperty(key)) {
          this.playerState[key] = Number(this.playerState[key]) - val;
        }
        // Loot notification: "Lost X key"
        var label = key.replace('_', ' ');
        this._showNotification('Lost ' + val + ' ' + label, 'loss');
      }
      // Simple assignment: key = value
      else if (stmt.indexOf('=') !== -1) {
        var parts = stmt.split('=');
        var key = parts[0].trim();
        var rawVal = parts[1].trim();

        // Parse the value
        var val;
        if (rawVal === 'true') {
          val = true;
        } else if (rawVal === 'false') {
          val = false;
        } else if (!isNaN(Number(rawVal))) {
          val = Number(rawVal);
        } else {
          val = rawVal;
        }

        this.playerState[key] = val;

        // Loot notification for boolean assignments
        if (val === true || val === false) {
          var label = key.replace('has_', '').replace('_', ' ');
          if (val === true) {
            this._showNotification('Acquired ' + label, 'gain');
          } else {
            this._showNotification('Lost ' + label, 'loss');
          }
        }
      }
    }
  }

  /* ──────────────────────────────────────────────
     LOOT DROP NOTIFICATION HELPER
     ────────────────────────────────────────────── */
  _showNotification(msg, type) {
    if (!type) type = 'gain';
    var el = document.createElement('div');
    el.className = 'loot-notification loot-' + type;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function() { el.remove(); }, 2500);
  }

  /* ──────────────────────────────────────────────
     SAVE & RESUME PROGRESS
     Uses localStorage to save/load the current
     scene and player state.
     ────────────────────────────────────────────── */
  _saveKey() {
    var title = (this.storyData && this.storyData.story_title) || 'untitled';
    return 'storyengine_save_' + title.replace(/\s+/g, '_').toLowerCase();
  }

  saveProgress() {
    if (!this.currentScene || !this.storyData) return false;
    var save = {
      sceneId:     this.currentScene.id,
      playerState: JSON.parse(JSON.stringify(this.playerState)),
      storyTitle:  this.storyData.story_title,
      savedAt:     new Date().toISOString(),
      path:        this._currentPath.slice()
    };
    localStorage.setItem(this._saveKey(), JSON.stringify(save));
    return true;
  }

  loadProgress() {
    var raw = localStorage.getItem(this._saveKey());
    if (!raw) return false;
    try {
      var save = JSON.parse(raw);
      this.playerState  = save.playerState;
      this._currentPath = save.path || [];
      this.goToScene(save.sceneId);
      return true;
    } catch (e) {
      console.log('Failed to load save:', e);
      return false;
    }
  }

  hasSavedProgress() {
    return !!localStorage.getItem(this._saveKey());
  }

  deleteSave() {
    localStorage.removeItem(this._saveKey());
  }

  /* ──────────────────────────────────────────────
     STORY VALIDATION
     Checks for basic issues using simple for loops:
     - Scenes with empty text
     - Choices pointing to non-existent scenes
     ────────────────────────────────────────────── */
  static validateStory(json) {
    var issues = [];

    if (!json || !json.scenes || json.scenes.length === 0) {
      issues.push({ severity: 'error', message: 'Story has no scenes.' });
      return issues;
    }

    // Collect all valid scene IDs
    var validIds = [];
    for (var i = 0; i < json.scenes.length; i++) {
      validIds.push(json.scenes[i].id);
    }

    // Check each scene
    for (var i = 0; i < json.scenes.length; i++) {
      var scene = json.scenes[i];

      // Check for empty text
      if (!scene.text || scene.text.trim() === '') {
        issues.push({
          severity: 'warning',
          message: 'Scene "' + scene.id + '" has empty text.'
        });
      }

      // Check each choice
      var choices = scene.choices || [];
      for (var j = 0; j < choices.length; j++) {
        var choice = choices[j];
        var targetId = choice.target_scene_id;

        // Check if target exists in valid IDs
        if (!targetId || targetId.trim() === '') {
          issues.push({
            severity: 'error',
            message: 'Scene "' + scene.id + '", choice ' + (j + 1) + ': missing target scene ID.'
          });
        } else if (validIds.indexOf(targetId) === -1) {
          issues.push({
            severity: 'error',
            message: 'Scene "' + scene.id + '", choice ' + (j + 1) + ': target "' + targetId + '" does not exist (broken link).'
          });
        }
      }
    }

    if (issues.length === 0) {
      issues.push({ severity: 'info', message: 'All checks passed — story is valid!' });
    }

    return issues;
  }

  /* ──────────────────────────────────────────────
     PLAYTHROUGH TRACKING
     Records completed runs in localStorage.
     ────────────────────────────────────────────── */
  _playthroughKey() {
    var title = (this.storyData && this.storyData.story_title) || 'untitled';
    return 'storyengine_runs_' + title.replace(/\s+/g, '_').toLowerCase();
  }

  _recordPlaythrough() {
    if (this._currentPath.length < 2) return;
    var runs = this.getPlaythroughs();
    runs.push({
      id:         Date.now(),
      finishedAt: new Date().toISOString(),
      finalScene: this._currentPath[this._currentPath.length - 1].sceneId,
      steps:      this._currentPath.length,
      path:       this._currentPath.slice(),
      finalState: JSON.parse(JSON.stringify(this.playerState))
    });
    // Keep last 20 runs
    while (runs.length > 20) runs.shift();
    localStorage.setItem(this._playthroughKey(), JSON.stringify(runs));
  }

  getPlaythroughs() {
    try {
      return JSON.parse(localStorage.getItem(this._playthroughKey()) || '[]');
    } catch (e) {
      return [];
    }
  }

  clearPlaythroughs() {
    localStorage.removeItem(this._playthroughKey());
  }
}
