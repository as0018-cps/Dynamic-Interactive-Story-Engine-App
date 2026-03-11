/* ═══════════════════════════════════════════════
   STORY ENGINE — app.js
   Bootstrap: wires together engine + editor,
   handles mode switching, save/load, and
   playthrough history display.
   ═══════════════════════════════════════════════ */

(function () {
  'use strict';

  const engine = new StoryEngine();
  const editor = new StoryEditor();

  // DOM
  const playerMode  = document.getElementById('playerMode');
  const editorMode  = document.getElementById('editorMode');
  const btnPlayer   = document.getElementById('btnPlayerMode');
  const btnEditor   = document.getElementById('btnEditorMode');
  const btnRestart  = document.getElementById('btnRestart');
  const btnSave     = document.getElementById('btnSaveProgress');
  const btnLoad     = document.getElementById('btnLoadProgress');
  const btnHistory  = document.getElementById('btnHistory');

  /* ──────────────────────────────────────────────
     MODE SWITCHING
     ────────────────────────────────────────────── */
  function switchMode (mode, storyJSON) {
    if (mode === 'player') {
      editorMode.classList.add('hidden');
      playerMode.classList.remove('hidden');
      btnPlayer.classList.add('active');
      btnEditor.classList.remove('active');

      if (storyJSON) {
        engine.loadStory(storyJSON);
      }
    } else {
      playerMode.classList.add('hidden');
      editorMode.classList.remove('hidden');
      btnEditor.classList.add('active');
      btnPlayer.classList.remove('active');
    }
  }

  // Expose for editor.playStory()
  window.app = { switchMode: switchMode };

  btnPlayer.addEventListener('click', () => {
    const saved = localStorage.getItem('storyengine_story');
    if (saved) {
      switchMode('player', JSON.parse(saved));
    } else {
      loadDefaultStory().then(json => switchMode('player', json));
    }
  });

  btnEditor.addEventListener('click', () => switchMode('editor'));
  btnRestart.addEventListener('click', () => engine.restart());

  // Cinematic mode toggle
  var btnCinematic = document.getElementById('btnCinematic');
  btnCinematic.addEventListener('click', function() {
    document.getElementById('playerHUD').classList.toggle('hide-ui');
    document.getElementById('choicesPanel').classList.toggle('hide-ui');
    document.getElementById('navbar').classList.toggle('hide-ui');
  });

  /* ──────────────────────────────────────────────
     SAVE / LOAD PROGRESS
     ────────────────────────────────────────────── */
  btnSave.addEventListener('click', () => {
    if (engine.saveProgress()) {
      _toast('Progress saved!', 'success');
    } else {
      _toast('No active story to save', 'error');
    }
  });

  btnLoad.addEventListener('click', () => {
    if (engine.loadProgress()) {
      _toast('Progress loaded!', 'success');
    } else {
      _toast('No saved progress found', 'info');
    }
  });

  /* ──────────────────────────────────────────────
     PLAYTHROUGH HISTORY
     ────────────────────────────────────────────── */
  btnHistory.addEventListener('click', () => {
    const runs = engine.getPlaythroughs();
    const body = document.getElementById('historyBody');
    body.innerHTML = '';

    if (!runs.length) {
      body.innerHTML = '<p class="history-empty">No completed playthroughs yet. Finish a story to see your history!</p>';
    } else {
      runs.slice().reverse().forEach((run, ri) => {
        const div = document.createElement('div');
        div.className = 'history-run';

        const endScene = run.finalScene || 'unknown';
        const date = new Date(run.finishedAt).toLocaleString();
        const pathStr = run.path.map(p => p.sceneId).join(' → ');

        div.innerHTML = `
          <div class="history-run-header">
            <span class="run-number">#${runs.length - ri}</span>
            <span class="run-date">${_esc(date)}</span>
            <span class="run-ending">Ending: <strong>${_esc(endScene)}</strong></span>
            <span class="run-steps">${run.steps} scenes</span>
          </div>
          <div class="history-run-path">${_esc(pathStr)}</div>
          <div class="history-run-state">${_formatState(run.finalState)}</div>
        `;
        body.appendChild(div);
      });

      // Clear button
      const clearBtn = document.createElement('button');
      clearBtn.className = 'btn-danger history-clear-btn';
      clearBtn.textContent = '🗑 Clear History';
      clearBtn.addEventListener('click', () => {
        engine.clearPlaythroughs();
        body.innerHTML = '<p class="history-empty">History cleared.</p>';
        clearBtn.remove();
      });
      body.appendChild(clearBtn);
    }

    document.getElementById('historyOverlay').classList.remove('hidden');
  });

  /* ──────────────────────────────────────────────
     EMBEDDED DEFAULT STORY
     Showcases backgrounds, effects, and sounds.
     ────────────────────────────────────────────── */
  const DEFAULT_STORY = {
    "story_title": "The Crown of Ashenvale",
    "global_theme": "medieval",
    "player_state": { "gold": 15, "has_sword": false, "reputation": 0, "has_key": false },
    "scenes": [
      {
        "id": "tavern_entrance",
        "text": "You push open the heavy oak door of the Gilded Flagon tavern. Smoke curls lazily from a crackling hearth, and the low hum of conversation fills the room. A grizzled blacksmith sits in the corner polishing a fine blade, and a hooded stranger beckons you from a shadowy booth. Your coin pouch jingles \u2014 you have some gold to spend.",
        "background_image": "tavern", "visual_effect": "blur",
        "choices": [
          { "text": "Approach the blacksmith about the sword (10 gold)", "target_scene_id": "buy_sword", "condition": "gold >= 10", "modifier": "gold -= 10; has_sword = true" },
          { "text": "Slide into the booth with the hooded stranger", "target_scene_id": "stranger_meeting", "condition": "", "modifier": "" },
          { "text": "Leave the tavern and head for the castle gates", "target_scene_id": "castle_gate", "condition": "", "modifier": "" }
        ]
      },
      {
        "id": "buy_sword",
        "text": "The blacksmith nods approvingly as you count out ten gold coins. He slides a gleaming short sword across the table. \"She'll serve you well,\" he grunts. The weight of steel at your hip fills you with confidence. The hooded stranger in the corner watches you with renewed interest.",
        "background_image": "tavern", "visual_effect": "flash",
        "choices": [
          { "text": "Now speak with the hooded stranger", "target_scene_id": "stranger_meeting", "condition": "", "modifier": "reputation += 1" },
          { "text": "Head directly to the castle", "target_scene_id": "castle_gate", "condition": "", "modifier": "" }
        ]
      },
      {
        "id": "stranger_meeting",
        "text": "The stranger lowers her hood, revealing sharp elven features and violet eyes. \"I know why you've come,\" she whispers. \"The Crown of Ashenvale lies within the castle vault, but its guardian is no mortal. You'll need more than courage.\" She places a tarnished brass key on the table. \"Take it. The side passage will bypass the main guard. But choose wisely what you carry \u2014 and whom you trust.\"",
        "background_image": "tavern", "visual_effect": "vignette",
        "choices": [
          { "text": "Accept the key and thank her", "target_scene_id": "castle_gate", "condition": "", "modifier": "has_key = true; reputation += 1" },
          { "text": "Refuse the key \u2014 it could be a trap", "target_scene_id": "castle_gate", "condition": "", "modifier": "reputation -= 1" }
        ]
      },
      {
        "id": "castle_gate",
        "text": "The ancient castle looms above you, its walls scarred by centuries of siege. Two armoured guards flank the main gate, halberds crossed. A narrow, ivy-covered passage runs along the eastern wall \u2014 barely visible unless you knew to look for it.",
        "background_image": "castle", "visual_effect": "zoom_in",
        "choices": [
          { "text": "Use the brass key on the side passage", "target_scene_id": "vault_approach", "condition": "has_key == true", "modifier": "" },
          { "text": "Bluff your way past the guards", "target_scene_id": "guard_encounter", "condition": "reputation >= 1", "modifier": "" },
          { "text": "Fight through the front gate", "target_scene_id": "guard_encounter", "condition": "has_sword == true", "modifier": "reputation -= 1" }
        ]
      },
      {
        "id": "guard_encounter",
        "text": "The confrontation at the gate is tense. Steel clashes against steel, voices shout commands. Whether through blade or bluster you manage to break through, but the commotion has echoed through the keep. You stumble through corridors until you find the heavy iron door of the vault. It is battered but holds firm.",
        "background_image": "dungeon", "visual_effect": "rumble",
        "choices": [
          { "text": "Force the vault door open with your sword", "target_scene_id": "ending_glory", "condition": "has_sword == true", "modifier": "" },
          { "text": "Search for another way in", "target_scene_id": "ending_cunning", "condition": "", "modifier": "" }
        ]
      },
      {
        "id": "vault_approach",
        "text": "The brass key turns with a satisfying click. The side passage opens into a moonlit corridor lined with faded tapestries. You move silently through the darkness, arriving at the vault from a hidden entrance behind a bookshelf. No guards, no alarms. The Crown of Ashenvale sits on a velvet pedestal, glowing faintly.",
        "background_image": "forest", "visual_effect": "pulse_glow",
        "choices": [
          { "text": "Take the Crown", "target_scene_id": "ending_cunning", "condition": "", "modifier": "reputation += 2" }
        ]
      },
      {
        "id": "ending_glory",
        "text": "With a mighty heave, your blade shatters the vault lock. The Crown of Ashenvale blazes with golden light as you lift it from its pedestal. Guards pour in, but fall to their knees at the sight. The ancient prophecy is fulfilled \u2014 the one who claims the crown by steel shall rule. You are the new sovereign of Ashenvale, crowned in battle and blood.\n\n\u2694 THE END \u2014 Path of Glory",
        "background_image": "throne", "visual_effect": "flash_white",
        "choices": []
      },
      {
        "id": "ending_cunning",
        "text": "You lift the Crown gently. It pulses with a cool, silver light that seeps into your very bones. No alarms sound. No blades are drawn. By dawn, word spreads of a phantom who walked through walls and claimed the throne's birthright. The people call you the Shadow Sovereign \u2014 a ruler who won a kingdom without spilling a single drop of blood.\n\n\ud83d\udc51 THE END \u2014 Path of Cunning",
        "background_image": "throne", "visual_effect": "glitch",
        "choices": []
      }
    ]
  };

  async function loadDefaultStory () {
    try {
      const resp = await fetch('story.json');
      if (!resp.ok) throw new Error('fetch failed');
      return await resp.json();
    } catch (e) {
      console.log('Using embedded default story.');
      return DEFAULT_STORY;
    }
  }

  /* ──────────────────────────────────────────────
     HELPERS
     ────────────────────────────────────────────── */
  function _toast (msg, type = 'info') {
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  function _esc (str) {
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _formatState (state) {
    if (!state) return '';
    return Object.entries(state).map(([k, v]) => {
      const display = typeof v === 'boolean' ? (v ? '✔' : '✘') : String(v);
      return `<span class="hstate-badge">${k.replace(/_/g, ' ')}: <strong>${display}</strong></span>`;
    }).join(' ');
  }

  // Boot
  (async function boot () {
    const saved = localStorage.getItem('storyengine_story');
    if (saved) {
      try {
        const json = JSON.parse(saved);
        engine.loadStory(json);
        editor.loadStoryIntoEditor(json);
        return;
      } catch (e) { /* fall through */ }
    }

    const json = await loadDefaultStory();
    engine.loadStory(json);
    editor.loadStoryIntoEditor(json);
  })();
})();
