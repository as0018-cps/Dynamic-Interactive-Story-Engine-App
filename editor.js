/* ═══════════════════════════════════════════════
   STORY ENGINE — editor.js
   Simple editor for creating and managing
   story scenes, choices, and variables.
   Includes: validation panel, export/import.
   ═══════════════════════════════════════════════ */

class StoryEditor {
  constructor() {
    // DOM references — metadata
    this.edTitle      = document.getElementById('edTitle');
    this.edTheme      = document.getElementById('edTheme');
    this.varsContainer = document.getElementById('varsContainer');

    // DOM references — scene editor
    this.edSceneId    = document.getElementById('edSceneId');
    this.edSceneText  = document.getElementById('edSceneText');
    this.edBg         = document.getElementById('edBg');
    this.edVisual     = document.getElementById('edVisual');
    this.choicesEdCon = document.getElementById('choicesEdContainer');

    // DOM references — scene list
    this.sceneListEl  = document.getElementById('sceneList');

    // Internal data
    this.scenes       = [];      // array of scene objects
    this.variables    = {};      // initial player_state
    this.activeSceneIdx = -1;    // which scene is being edited

    this._bindButtons();
    this._renderVariableRows();
    this._renderChoiceSlots();

    // Real-time slugifier on Scene ID input
    var self = this;
    this.edSceneId.addEventListener('input', function() {
      self.edSceneId.value = self._slugify(self.edSceneId.value);
    });
  }

  /* ──────────────────────────────────────────────
     BUTTON BINDINGS
     ────────────────────────────────────────────── */
  _bindButtons() {
    var self = this;

    document.getElementById('btnAddVar').addEventListener('click', function() {
      self.addVariableRow();
    });
    document.getElementById('btnAddChoice').addEventListener('click', function() {
      self._addChoiceSlot();
    });
    document.getElementById('btnNewScene').addEventListener('click', function() {
      self.newScene();
    });
    document.getElementById('btnSaveScene').addEventListener('click', function() {
      self.saveCurrentScene();
    });
    document.getElementById('btnDeleteScene').addEventListener('click', function() {
      self.deleteCurrentScene();
    });
    document.getElementById('btnSaveStory').addEventListener('click', function() {
      self.saveToLocalStorage();
    });
    document.getElementById('btnExportJSON').addEventListener('click', function() {
      self.exportJSON();
    });
    document.getElementById('btnImportJSON').addEventListener('click', function() {
      document.getElementById('fileImport').click();
    });
    document.getElementById('fileImport').addEventListener('change', function(e) {
      self.importJSON(e);
    });
    document.getElementById('btnPlayStory').addEventListener('click', function() {
      self.playStory();
    });
    document.getElementById('btnValidate').addEventListener('click', function() {
      self.showValidation();
    });

    // Reset to Default — clears saved story and reloads
    document.getElementById('btnResetStory').addEventListener('click', function() {
      var ok = confirm('Reset the story to its default? All your saved changes will be lost.');
      if (ok) {
        localStorage.removeItem('storyengine_story');
        window.location.reload();
      }
    });

    // Close validation modal
    document.getElementById('closeValidation').addEventListener('click', function() {
      document.getElementById('validationOverlay').classList.add('hidden');
    });

    // Close history modal
    document.getElementById('closeHistory').addEventListener('click', function() {
      document.getElementById('historyOverlay').classList.add('hidden');
    });
  }

  /* ──────────────────────────────────────────────
     VARIABLE MANAGEMENT
     ────────────────────────────────────────────── */
  _renderVariableRows() {
    this.varsContainer.innerHTML = '';
    var keys = Object.keys(this.variables);
    for (var i = 0; i < keys.length; i++) {
      this._createVarRow(keys[i], this.variables[keys[i]]);
    }
  }

  _createVarRow(key, val) {
    if (key === undefined) key = '';
    if (val === undefined) val = '';

    var row = document.createElement('div');
    row.className = 'var-row';
    row.innerHTML =
      '<input type="text" class="var-key" placeholder="Variable name" value="' + this._esc(String(key)) + '">' +
      '<input type="text" class="var-val" placeholder="Initial value" value="' + this._esc(String(val)) + '">' +
      '<button class="btn-remove-var" title="Remove">✕</button>';

    row.querySelector('.btn-remove-var').addEventListener('click', function() {
      row.remove();
    });
    this.varsContainer.appendChild(row);
  }

  addVariableRow() {
    this._createVarRow('', '');
  }

  _collectVariables() {
    var vars = {};
    var rows = this.varsContainer.querySelectorAll('.var-row');
    for (var i = 0; i < rows.length; i++) {
      var k = rows[i].querySelector('.var-key').value.trim();
      var v = rows[i].querySelector('.var-val').value.trim();
      if (!k) continue;

      // Parse value type
      if (v === 'true') v = true;
      else if (v === 'false') v = false;
      else if (!isNaN(Number(v)) && v !== '') v = Number(v);

      vars[k] = v;
    }
    return vars;
  }

  /* ──────────────────────────────────────────────
     CHOICE SLOTS (max 3 per scene)
     ────────────────────────────────────────────── */
  _renderChoiceSlots(choices) {
    if (!choices) choices = [];
    this.choicesEdCon.innerHTML = '';
    for (var i = 0; i < choices.length; i++) {
      this._createChoiceBlock(i, choices[i]);
    }
  }

  _addChoiceSlot() {
    var count = this.choicesEdCon.querySelectorAll('.choice-edit-block').length;
    if (count >= 3) {
      this._toast('Maximum 3 choices per scene', 'error');
      return;
    }
    this._createChoiceBlock(count, {});
  }

  _createChoiceBlock(index, data) {
    if (!data) data = {};
    var self = this;

    var block = document.createElement('div');
    block.className = 'choice-edit-block';
    block.innerHTML =
      '<div class="choice-header">' +
        '<span class="choice-label">Choice ' + (index + 1) + '</span>' +
        '<button class="btn-remove-choice" title="Remove">✕</button>' +
      '</div>' +
      '\x3cdiv class="choice-fields"\x3e' +
        '\x3cdiv class="form-row"\x3e' +
          '\x3clabel\x3eText\x3c/label\x3e' +
          '\x3cinput type="text" class="ch-text" placeholder="Choice text" value="' + this._esc(data.text || '') + '"\x3e' +
        '\x3c/div\x3e' +
        '\x3cdiv class="form-row"\x3e' +
          '\x3clabel\x3eGoes to Scene...\x3c/label\x3e' +
          '\x3cinput type="text" class="ch-target" placeholder="tavern_entrance" value="' + this._esc(data.target_scene_id || '') + '"\x3e' +
        '\x3c/div\x3e' +
        '\x3cdiv class="form-row"\x3e' +
          '\x3clabel\x3eCondition\x3c/label\x3e' +
          '\x3cinput type="text" class="ch-cond" placeholder="gold \x3e= 10" value="' + this._esc(data.condition || '') + '"\x3e' +
        '\x3c/div\x3e' +
        '\x3cdiv class="form-row"\x3e' +
          '\x3clabel\x3eModifier\x3c/label\x3e' +
          '\x3cinput type="text" class="ch-mod" placeholder="gold -= 10" value="' + this._esc(data.modifier || '') + '"\x3e' +
        '\x3c/div\x3e' +
      '\x3c/div\x3e';

    // Real-time slugifier on target scene input
    var targetInput = block.querySelector('.ch-target');
    targetInput.addEventListener('input', function() {
      targetInput.value = self._slugify(targetInput.value);
    });

    block.querySelector('.btn-remove-choice').addEventListener('click', function() {
      block.remove();
      self._relabelChoices();
    });
    this.choicesEdCon.appendChild(block);
  }

  _relabelChoices() {
    var blocks = this.choicesEdCon.querySelectorAll('.choice-edit-block');
    for (var i = 0; i < blocks.length; i++) {
      blocks[i].querySelector('.choice-label').textContent = 'Choice ' + (i + 1);
    }
  }

  _collectChoices() {
    var choices = [];
    var blocks = this.choicesEdCon.querySelectorAll('.choice-edit-block');
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      choices.push({
        text:            b.querySelector('.ch-text').value.trim(),
        target_scene_id: b.querySelector('.ch-target').value.trim(),
        condition:       b.querySelector('.ch-cond').value.trim(),
        modifier:        b.querySelector('.ch-mod').value.trim()
      });
    }
    return choices;
  }

  /* ──────────────────────────────────────────────
     SCENE MANAGEMENT
     ────────────────────────────────────────────── */
  newScene() {
    this.activeSceneIdx = -1;
    this.edSceneId.value = '';
    this.edSceneText.value = '';
    this.edBg.value = 'tavern';
    this.edVisual.value = 'none';
    this._renderChoiceSlots([]);
    this._highlightActiveScene();
  }

  saveCurrentScene() {
    var id = this.edSceneId.value.trim();
    if (!id) {
      this._toast('Scene ID is required', 'error');
      return;
    }

    var scene = {
      id:               id,
      text:             this.edSceneText.value.trim(),
      background_image: this.edBg.value,
      visual_effect:    this.edVisual.value,
      choices:          this._collectChoices()
    };

    if (this.activeSceneIdx >= 0) {
      // Update existing scene
      this.scenes[this.activeSceneIdx] = scene;
    } else {
      // Check for duplicate ID
      for (var i = 0; i < this.scenes.length; i++) {
        if (this.scenes[i].id === id) {
          this._toast('A scene with this ID already exists', 'error');
          return;
        }
      }
      this.scenes.push(scene);
      this.activeSceneIdx = this.scenes.length - 1;
    }

    this._renderSceneList();
    this._highlightActiveScene();
    this._toast('Scene saved', 'success');
  }

  deleteCurrentScene() {
    if (this.activeSceneIdx < 0) return;
    this.scenes.splice(this.activeSceneIdx, 1);
    this.activeSceneIdx = -1;
    this.newScene();
    this._renderSceneList();
    this._toast('Scene deleted', 'info');
  }

  loadSceneIntoEditor(idx) {
    var s = this.scenes[idx];
    if (!s) return;
    this.activeSceneIdx = idx;
    this.edSceneId.value   = s.id;
    this.edSceneText.value = s.text;
    this.edBg.value        = s.background_image || 'tavern';
    this.edVisual.value    = s.visual_effect || 'none';
    this._renderChoiceSlots(s.choices || []);
    this._highlightActiveScene();
  }

  _renderSceneList() {
    this.sceneListEl.innerHTML = '';
    var self = this;
    for (var i = 0; i < this.scenes.length; i++) {
      (function(index) {
        var li = document.createElement('li');
        li.className = 'scene-list-item';
        li.textContent = self.scenes[index].id;
        li.addEventListener('click', function() {
          self.loadSceneIntoEditor(index);
        });
        self.sceneListEl.appendChild(li);
      })(i);
    }
  }

  _highlightActiveScene() {
    var items = this.sceneListEl.querySelectorAll('.scene-list-item');
    for (var i = 0; i < items.length; i++) {
      if (i === this.activeSceneIdx) {
        items[i].classList.add('active');
      } else {
        items[i].classList.remove('active');
      }
    }
  }

  /* ──────────────────────────────────────────────
     BUILD / EXPORT / IMPORT / PLAY
     ────────────────────────────────────────────── */
  buildJSON() {
    return {
      story_title:  this.edTitle.value.trim() || 'Untitled Story',
      global_theme: this.edTheme.value,
      player_state: this._collectVariables(),
      scenes:       JSON.parse(JSON.stringify(this.scenes))
    };
  }

  saveToLocalStorage() {
    var data = this.buildJSON();
    localStorage.setItem('storyengine_story', JSON.stringify(data));
    this._toast('Saved to browser storage', 'success');
  }

  loadStoryIntoEditor(json) {
    this.edTitle.value = json.story_title || '';
    this.edTheme.value = json.global_theme || 'medieval';
    this.variables = json.player_state || {};
    this.scenes    = json.scenes || [];
    this._renderVariableRows();
    this._renderSceneList();
    if (this.scenes.length > 0) {
      this.loadSceneIntoEditor(0);
    } else {
      this.newScene();
    }
  }

  exportJSON() {
    var data = this.buildJSON();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = (data.story_title.replace(/\s+/g, '_') || 'story') + '.json';
    a.click();
    URL.revokeObjectURL(url);
    this._toast('JSON exported', 'success');
  }

  importJSON(event) {
    var self = this;
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var json = JSON.parse(e.target.result);
        self.loadStoryIntoEditor(json);
        self._toast('Story imported!', 'success');
      } catch (err) {
        self._toast('Invalid JSON file', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  playStory() {
    var data = this.buildJSON();
    if (data.scenes.length === 0) {
      this._toast('Add at least one scene before playing', 'error');
      return;
    }
    localStorage.setItem('storyengine_story', JSON.stringify(data));
    if (window.app) window.app.switchMode('player', data);
  }

  /* ──────────────────────────────────────────────
     STORY VALIDATION UI
     Shows validation results in a modal overlay.
     ────────────────────────────────────────────── */
  showValidation() {
    var data   = this.buildJSON();
    var issues = StoryEngine.validateStory(data);
    var body   = document.getElementById('validationBody');
    body.innerHTML = '';

    for (var i = 0; i < issues.length; i++) {
      var item = issues[i];
      var row = document.createElement('div');
      row.className = 'validation-row severity-' + item.severity;

      var icon;
      if (item.severity === 'error') icon = '❌';
      else if (item.severity === 'warning') icon = '⚠️';
      else icon = 'ℹ️';

      row.innerHTML = '<span class="v-icon">' + icon + '</span><span class="v-msg">' + this._esc(item.message) + '</span>';
      body.appendChild(row);
    }

    document.getElementById('validationOverlay').classList.remove('hidden');
  }

  /* ──────────────────────────────────────────────
     HELPERS
     ────────────────────────────────────────────── */
  _slugify(str) {
    return str.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  _esc(str) {
    return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  _toast(msg, type) {
    if (!type) type = 'info';
    var t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function() { t.remove(); }, 2600);
  }
}
