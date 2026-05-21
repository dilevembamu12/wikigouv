(function () {
  var root = document.getElementById('learningPageRoot');
  if (!root) return;

  var loading = document.getElementById('learningPlayerLoading');
  var content = document.getElementById('learningPlayerContent');
  var pageContent = document.getElementById('learningPageContent');
  var itemButtons = Array.prototype.slice.call(document.querySelectorAll('.js-learning-item'));
  if (!itemButtons.length) return;

  var titleEl = document.getElementById('learningCurrentTitle');
  var typeEl = document.getElementById('learningCurrentType');
  var descEl = document.getElementById('learningCurrentDesc');
  var prevBtn = document.getElementById('learningPrevBtn');
  var nextBtn = document.getElementById('learningNextBtn');
  var doneBtn = document.getElementById('learningDoneBtn');
  var passToggle = document.getElementById('learningPassToggle');
  var stage = document.getElementById('learningPlayerStage');
  var debugPanel = document.getElementById('learningDebugPanel');
  var debugEnabled = String(root.getAttribute('data-debug') || '').toLowerCase() === '1'
    || String(window.localStorage.getItem('wikigouv:learning:debug') || '').toLowerCase() === '1'
    || (window.location.search || '').indexOf('debugLearning=1') >= 0;
  var videoJsPlayer = null;
  var pctEl = document.getElementById('learningPct');
  var doneCountEl = document.getElementById('learningDoneCount');
  var totalCountEl = document.getElementById('learningTotalCount');
  var barEl = document.getElementById('learningProgressBar');
  var topPctEl = document.getElementById('learningTopProgressPct');
  var topBarEl = document.getElementById('learningTopProgressBar');
  var lastTopProgressPct = null;
  var noteEl = document.getElementById('learningPersonalNote');
  var saveNoteBtn = document.getElementById('learningSaveNoteBtn');
  var resumeBtn = document.getElementById('learningResumeBtn');
  var resumeBtnText = document.getElementById('learningResumeBtnText');

  var tabs = Array.prototype.slice.call(document.querySelectorAll('.learning-tabs .tab'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.learning-panel'));
  var toggles = Array.prototype.slice.call(document.querySelectorAll('.js-toggle-section'));
  var addBtns = Array.prototype.slice.call(document.querySelectorAll('.js-add-item'));
  var sectionActionBtns = Array.prototype.slice.call(document.querySelectorAll('.js-section-action'));
  var collapseBtn = document.getElementById('collapseBtn');
  var tabsContainer = document.querySelector('.learning-page-tabs');
  var contentSearchInput = document.getElementById('learningContentSearch');
  var contentSearchMeta = document.getElementById('learningContentSearchMeta');

  function syncStageViewportHeight() {
    if (!content || !stage) return;
    if (content.classList.contains('d-none')) return;

    var contentRect = content.getBoundingClientRect();
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    if (!viewportHeight) return;

    var visibleTop = Math.max(0, contentRect.top);
    var visibleHeight = Math.max(320, Math.floor(viewportHeight - visibleTop - 20));
    stage.style.height = visibleHeight + 'px';
  }

  var courseId = String(root.getAttribute('data-course-id') || '');
  var completedRaw = String(root.getAttribute('data-completed') || '');
  var serverLastViewRaw = String(root.getAttribute('data-server-last-view') || '');
  var completedFromApi = {};
  try { completedFromApi = JSON.parse(decodeURIComponent(completedRaw)) || {}; } catch (_) { completedFromApi = {}; }
  var serverLastView = {};
  try { serverLastView = JSON.parse(decodeURIComponent(serverLastViewRaw)) || {}; } catch (_) { serverLastView = {}; }

  var storageKey = 'wikigouv:learning:v2:' + courseId;
  var lastViewKey = storageKey + ':last';
  var visitedKey = storageKey + ':visited';
  var completed = {};
  try { completed = JSON.parse(window.localStorage.getItem(storageKey) || '{}') || {}; } catch (_) { completed = {}; }
  var visited = {};
  try { visited = JSON.parse(window.localStorage.getItem(visitedKey) || '{}') || {}; } catch (_) { visited = {}; }

  var current = 0;
  var addTypeToTab = {
    file: 'files',
    interactive_file: 'interactive',
    text_lesson: 'text_lessons',
    quiz: 'quiz',
    assignment: 'assignments'
  };
  var typeLabels = {
    file: 'Video',
    interactive_file: 'SCORM / Interactive Files',
    text_lesson: 'Text Lesson',
    session: 'Live Session',
    assignment: 'Assignment',
    quiz: 'Quiz',
    prerequisite: 'Prerequisite',
    related_course: 'Related Course'
  };

  function debugLog(eventName, payload) {
    if (!debugEnabled) return;
    var stamp = new Date().toISOString();
    var data = payload && typeof payload === 'object' ? payload : { value: payload };
    try {
      // eslint-disable-next-line no-console
      console.log('[learning-debug]', eventName, data);
    } catch (_) {}

    if (!debugPanel) return;
    var line = document.createElement('div');
    line.className = 'learning-debug-line';
    line.textContent = '[' + stamp + '] ' + eventName + ' ' + JSON.stringify(data);
    debugPanel.prepend(line);
  }

  function setPlayerLoadingState(isLoading) {
    if (loading) {
      loading.classList.toggle('d-none', !isLoading);
      loading.setAttribute('aria-hidden', isLoading ? 'false' : 'true');
      if (isLoading) loading.style.display = 'flex';
      else loading.style.display = 'none';
    }
    if (content) {
      content.classList.toggle('d-none', !!isLoading);
      content.setAttribute('aria-hidden', isLoading ? 'true' : 'false');
      if (isLoading) content.style.display = 'none';
      else content.style.display = '';
    }
    if (!isLoading) {
      setTimeout(syncStageViewportHeight, 0);
    }
  }

  function removeLoadingNodeIfContentVisible() {
    if (!loading || !content) return;
    var contentVisible = !content.classList.contains('d-none')
      && content.getAttribute('aria-hidden') !== 'true'
      && content.offsetParent !== null;
    if (!contentVisible) return;
    loading.classList.add('d-none');
    loading.setAttribute('aria-hidden', 'true');
    loading.style.display = 'none';
    if (loading.parentNode) loading.parentNode.removeChild(loading);
    loading = null;
  }

  function cleanupDuplicatedLoaders() {
    if (!stage) return;
    var ghostLoaders = stage.querySelectorAll('.learning-content-loading');
    ghostLoaders.forEach(function (el) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
  }

  window.addEventListener('resize', syncStageViewportHeight);

  function inferRenderMode() {
    if (!stage) return 'unknown';
    if (stage.querySelector('video.video-js')) return 'video';
    if (stage.querySelector('audio')) return 'audio';
    if (stage.querySelector('iframe')) return 'iframe';
    if (stage.querySelector('img')) return 'image';
    if (stage.querySelector('.learning-text-lesson-article')) return 'text_lesson_article';
    if (stage.querySelector('.learning-player-placeholder')) return 'placeholder';
    return 'unknown';
  }

  function inferRenderModeByItem(type, source, mediaPath, fileType, summary, contentHtml) {
    var t = String(type || '').toLowerCase();
    var src = String(source || '').toLowerCase();
    var media = String(mediaPath || '').trim();
    var ft = String(fileType || '').toLowerCase();
    var hasTextBody = String(summary || '').trim() || String(contentHtml || '').trim();
    if (!media) {
      if (t === 'text_lesson' && hasTextBody) return 'text_lesson_article';
      return 'placeholder';
    }
    if (src === 'youtube' || src === 'vimeo') return 'video';
    if (/\.pdf(\?|#|$)/i.test(media)) return 'iframe';
    if (/\.html?(\?|#|$)/i.test(media)) return 'iframe';
    if (/\.(png|jpe?g|gif|webp|svg)(\?|#|$)/i.test(media)) return 'image';
    if (/\.(mp3|wav|ogg|m4a|aac|flac)(\?|#|$)/i.test(media) || ft === 'audio' || ft === 'sound') return 'audio';
    if (/\.(mp4|webm|ogg|mov|m4v|m3u8)(\?|#|$)/i.test(media) || ft === 'video') return 'video';
    if (t === 'session' && /^https?:\/\//i.test(media)) return 'iframe';
    return 'placeholder';
  }

  function applyResponsiveMediaFit() {
    if (!stage) return;
    stage.classList.remove('is-portrait-media', 'is-landscape-media');
    var videoEl = stage.querySelector('video');
    if (!videoEl) return;

    var w = Number(videoEl.videoWidth || 0);
    var h = Number(videoEl.videoHeight || 0);
    if (!w || !h) return;
    if (h > w) stage.classList.add('is-portrait-media');
    else stage.classList.add('is-landscape-media');
  }

  if (debugEnabled && debugPanel) {
    debugPanel.classList.remove('d-none');
    debugLog('debug:enabled', {
      courseId: courseId
    });
  }

  function isDone(key) {
    return Boolean(completed[key]) || Boolean(completedFromApi[key]);
  }

  function countDone() {
    var c = 0;
    for (var i = 0; i < itemButtons.length; i += 1) {
      var key = String(itemButtons[i].getAttribute('data-item-key') || '');
      if (key && isDone(key)) c += 1;
    }
    return c;
  }

  function updateProgress() {
    var total = itemButtons.length;
    var done = countDone();
    var pct = total ? Math.round((done / total) * 100) : 0;
    if (pctEl) pctEl.textContent = String(pct);
    if (doneCountEl) doneCountEl.textContent = String(done);
    if (totalCountEl) totalCountEl.textContent = String(total);
    if (barEl) barEl.style.width = pct + '%';
    if (topBarEl) {
      topBarEl.style.width = pct + '%';
      if (lastTopProgressPct === null || lastTopProgressPct !== pct) {
        topBarEl.classList.remove('is-bumping');
        // Force reflow so class re-add retriggers CSS transition/flash.
        // eslint-disable-next-line no-unused-expressions
        topBarEl.offsetHeight;
        topBarEl.classList.add('is-bumping');
        window.setTimeout(function () {
          topBarEl.classList.remove('is-bumping');
        }, 260);
      }
    }
    if (topPctEl) topPctEl.textContent = pct + '% termine';
    lastTopProgressPct = pct;

    itemButtons.forEach(function (btn) {
      var key = String(btn.getAttribute('data-item-key') || '');
      var doneIcon = btn.querySelector('.done');
      if (doneIcon) doneIcon.classList.toggle('d-none', !isDone(key));
      var inlineToggle = btn.querySelector('.js-passed-lesson-toggle');
      if (inlineToggle) inlineToggle.checked = isDone(key);
      var stateBadge = btn.querySelector('[data-item-state]');
      var isCurrent = btn.classList.contains('is-active') || btn.classList.contains('active');
      var isVisited = Boolean(visited[key]);
      if (stateBadge) {
        stateBadge.classList.remove('is-not-started', 'is-in-progress', 'is-completed');
        if (isDone(key)) {
          stateBadge.classList.add('is-completed');
          stateBadge.textContent = 'Completed';
        } else if (isCurrent || isVisited) {
          stateBadge.classList.add('is-in-progress');
          stateBadge.textContent = 'In progress';
        } else {
          stateBadge.classList.add('is-not-started');
          stateBadge.textContent = 'Not started';
        }
      }
    });
  }

  var renderToken = 0;

  function hasPlayableMedia(btn) {
    if (!btn) return false;
    var media = String(btn.getAttribute('data-item-media') || '').trim();
    var type = String(btn.getAttribute('data-item-type') || '').toLowerCase();
    if (media) return true;
    return type === 'text_lesson' || type === 'quiz' || type === 'assignment';
  }

  function firstPlayableIndex() {
    for (var i = 0; i < itemButtons.length; i += 1) {
      if (hasPlayableMedia(itemButtons[i])) return i;
    }
    return 0;
  }

  function findIndexByTypeAndId(type, id) {
    var t = String(type || '').trim().toLowerCase();
    var x = String(id || '').trim();
    if (!t || !x) return -1;
    for (var i = 0; i < itemButtons.length; i += 1) {
      var btn = itemButtons[i];
      var bt = String(btn.getAttribute('data-item-type') || '').trim().toLowerCase();
      var bid = String(btn.getAttribute('data-item-id') || '').trim();
      if (bt === t && bid === x) return i;
    }
    return -1;
  }

  function resolveInitialIndex() {
    var params = new URLSearchParams(window.location.search || '');
    var queryType = params.get('type') || '';
    var queryItem = params.get('item') || '';
    var fromQuery = findIndexByTypeAndId(queryType, queryItem);
    if (fromQuery >= 0) return fromQuery;

    var fromServer = findIndexByTypeAndId(serverLastView.itemType, serverLastView.itemId);
    if (fromServer >= 0) return fromServer;

    try {
      var last = JSON.parse(window.localStorage.getItem(lastViewKey) || '{}') || {};
      var fromLast = findIndexByTypeAndId(last.type, last.itemId);
      if (fromLast >= 0) return fromLast;
    } catch (_) {}

    return firstPlayableIndex();
  }

  function resolveResumeCandidate() {
    var fromServer = findIndexByTypeAndId(serverLastView.itemType, serverLastView.itemId);
    if (fromServer >= 0) return fromServer;
    try {
      var last = JSON.parse(window.localStorage.getItem(lastViewKey) || '{}') || {};
      var fromLast = findIndexByTypeAndId(last.type, last.itemId);
      if (fromLast >= 0) return fromLast;
    } catch (_) {}
    return -1;
  }

  function initResumeButton() {
    if (!resumeBtn) return;
    var resumeIndex = resolveResumeCandidate();
    if (resumeIndex < 0) return;
    var resumeItem = itemButtons[resumeIndex];
    if (!resumeItem) return;
    var title = String(resumeItem.getAttribute('data-item-title') || '').trim();
    if (resumeBtnText) {
      resumeBtnText.textContent = title ? ('Continuer: ' + title) : 'Continuer là où j’étais';
    }
    resumeBtn.classList.remove('d-none');
    resumeBtn.addEventListener('click', function () {
      render(resumeIndex);
    });
  }

  function isTypingContext(target) {
    if (!target) return false;
    var tag = String(target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (target.isContentEditable) return true;
    return false;
  }

  function bindKeyboardShortcuts() {
    window.addEventListener('keydown', function (event) {
      if (!event) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingContext(event.target)) return;
      var key = String(event.key || '').toLowerCase();
      if (key === 'j') {
        event.preventDefault();
        render(current - 1);
      } else if (key === 'k') {
        event.preventDefault();
        render(current + 1);
      }
    });
  }

  function persistLastView(type, itemId) {
    if (!courseId || !type || !itemId) return;

    fetch('/learning/courses/' + encodeURIComponent(courseId) + '/last-view', {
      method: 'POST',
      credentials: 'same-origin',
      redirect: 'manual',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ itemType: type, itemId: itemId })
    }).then(function (r) {
      if (!r || r.type === 'opaqueredirect' || r.status >= 300) return null;
      return r;
    }).catch(function () {
      // Best effort only: local fallback is already saved.
    });
  }

  function activateTab(target) {
    var tab = tabs.find(function (t) { return String(t.getAttribute('data-tab') || '') === String(target || ''); });
    if (!tab) return;
    tab.click();
  }

  function handleItemAction(actionBtn) {
    if (!actionBtn) return;
    var action = String(actionBtn.getAttribute('data-action') || '').trim();
    var targetTab = String(actionBtn.getAttribute('data-target-tab') || '').trim();
    if (action === 'switch-tab' && targetTab) {
      activateTab(targetTab);
      return;
    }

    var item = actionBtn.closest('.js-learning-item');
    if (!item) return;
    var media = String(item.getAttribute('data-item-media') || '').trim();
    var itemType = String(item.getAttribute('data-item-type') || '').trim();
    var scormIndex = String(item.getAttribute('data-item-scorm-index') || '').trim();
    var source = String(item.getAttribute('data-item-source') || '').trim().toLowerCase();
    var title = String(item.getAttribute('data-item-title') || 'resource').trim();

    if (!media) return;

    resolveScormPlayableMedia(media, itemType, scormIndex)
      .then(function (resolved) {
        var url = String(resolved || '').trim();
        if (!url) return;
        if (action === 'download') {
          if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) {
            url = '/' + url.replace(/^\/+/, '');
          }
          var a = document.createElement('a');
          a.href = appendQuery(url, { download: '1' });
          a.download = title.replace(/\s+/g, '-').toLowerCase();
          a.rel = 'noopener';
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return;
        }
        if (action === 'open') {
          if (itemType === 'session' && /^https?:\/\//i.test(media) && !/youtube|vimeo/i.test(source)) {
            window.open(media, '_blank', 'noopener');
            return;
          }
          window.open(url, '_blank', 'noopener');
        }
      })
      .catch(function () {});
  }

  function render(index) {
    current = Math.max(0, Math.min(itemButtons.length - 1, index));
    itemButtons.forEach(function (btn, i) {
      btn.classList.toggle('is-active', i === current);
      btn.classList.toggle('active', i === current);
    });
    var activeBtn = itemButtons[current];
    if (activeBtn && typeof activeBtn.scrollIntoView === 'function') {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }

    var btn = itemButtons[current];
    var key = String(btn.getAttribute('data-item-key') || '');
    var title = String(btn.getAttribute('data-item-title') || 'Contenu');
    var type = String(btn.getAttribute('data-item-type') || 'item');
    var desc = String(btn.getAttribute('data-item-desc') || '');
    var media = String(btn.getAttribute('data-item-media') || '');
    var source = String(btn.getAttribute('data-item-source') || '').toLowerCase();
    var fileType = String(btn.getAttribute('data-item-file-type') || '').toLowerCase();
    var scormIndex = String(btn.getAttribute('data-item-scorm-index') || '').trim();
    var itemId = String(btn.getAttribute('data-item-id') || '');
    var sessionDate = String(btn.getAttribute('data-session-date') || '').trim();
    var sessionDuration = Number(btn.getAttribute('data-session-duration') || 0);
    var sessionJoinWindow = Number(btn.getAttribute('data-session-join-window') || 0);
    var sessionStatus = String(btn.getAttribute('data-session-status') || '').trim();
    var quizTime = Number(btn.getAttribute('data-quiz-time') || 0);
    var quizQuestions = Number(btn.getAttribute('data-quiz-questions') || 0);
    var quizPassMark = Number(btn.getAttribute('data-quiz-pass-mark') || 0);
    var quizAttempts = Number(btn.getAttribute('data-quiz-attempts') || 0);
    var quizStatus = String(btn.getAttribute('data-quiz-status') || '').trim();
    var assignmentDeadline = String(btn.getAttribute('data-assignment-deadline') || '').trim();
    var assignmentPassGrade = Number(btn.getAttribute('data-assignment-pass-grade') || 0);
    var assignmentAttempts = Number(btn.getAttribute('data-assignment-attempts') || 0);
    var assignmentStatus = String(btn.getAttribute('data-assignment-status') || '').trim();
    debugLog('render:selected-item', {
      index: current,
      key: key,
      type: type,
      source: source,
      fileType: fileType,
      mediaRaw: media,
      itemId: itemId
    });

    if (titleEl) titleEl.textContent = title;
    if (typeEl) typeEl.textContent = typeLabels[type] || type;
    if (descEl) descEl.textContent = desc || 'Aucune description disponible pour cet element.';
    if (pageContent) pageContent.setAttribute('data-active-type', String(type || 'item').toLowerCase());

    if (doneBtn) {
      var done = isDone(key);
      doneBtn.disabled = done;
      doneBtn.textContent = done ? 'Deja termine' : 'Marquer termine';
    }
    if (passToggle) {
      passToggle.classList.toggle('is-on', isDone(key));
      passToggle.setAttribute('aria-pressed', isDone(key) ? 'true' : 'false');
    }

    try {
      window.localStorage.setItem(lastViewKey, JSON.stringify({ type: type, itemId: itemId }));
    } catch (_) {}
    if (key) {
      visited[key] = true;
      try { window.localStorage.setItem(visitedKey, JSON.stringify(visited)); } catch (_) {}
    }
    updateProgress();
    persistLastView(type, itemId);
    loadPersonalNote(type, itemId);

    setPlayerLoadingState(true);
    if (stage) {
      stage.classList.remove('is-switching');
      void stage.offsetWidth;
      stage.classList.add('is-switching');
    }
    if (stage) stage.innerHTML = '<div class="learning-player-placeholder"><i class="fa-solid fa-spinner fa-spin"></i><p>Chargement du contenu...</p></div>';
    cleanupDuplicatedLoaders();
    var token = ++renderToken;
    fetchItemInfo(type, itemId)
      .then(function (info) {
        var chosenMedia = media;
        var chosenSource = source;
        var chosenDesc = desc;
        var chosenSummary = '';
        var chosenContent = '';
        if (info) {
          var payload = info.file || info.session || info.textLesson || info.quiz || null;
          if (payload) {
            chosenMedia = String(payload.file_path || payload.file || media || '');
            chosenSource = String(payload.storage || source || '').toLowerCase();
            chosenDesc = String(payload.summary || payload.content || desc || '');
            chosenSummary = String(payload.summary || '');
            chosenContent = String(payload.content || '');
            fileType = String(payload.file_type || payload.type || fileType || '').toLowerCase();
            scormIndex = String(payload.interactive_file_name || payload.index_file_name || scormIndex || '').trim();
            sessionDate = String(payload.date || sessionDate || '').trim();
            sessionDuration = Number(payload.duration || sessionDuration || 0);
            sessionJoinWindow = Number(payload.extra_time_to_join || sessionJoinWindow || 0);
            sessionStatus = String(payload.status || sessionStatus || '').trim();
            quizQuestions = Number(payload.questions_count || payload.questionsCount || quizQuestions || 0);
            quizPassMark = Number(payload.pass_mark || quizPassMark || 0);
            quizAttempts = Number(payload.attempt || payload.attempts || quizAttempts || 0);
            quizStatus = String(payload.status || quizStatus || '').trim();
            assignmentDeadline = String(payload.deadline || assignmentDeadline || '').trim();
            assignmentPassGrade = Number(payload.pass_grade || assignmentPassGrade || 0);
            assignmentAttempts = Number(payload.attempts || payload.attempt || assignmentAttempts || 0);
            assignmentStatus = String(payload.status || assignmentStatus || '').trim();
            debugLog('render:itemInfo-payload', {
              source: chosenSource,
              fileType: fileType,
              mediaFromPayload: chosenMedia,
              scormIndex: scormIndex
            });
          }
        }
        if (descEl && chosenDesc) descEl.textContent = chosenDesc;
        return resolveScormPlayableMedia(chosenMedia, type, scormIndex).then(function (resolvedMedia) {
          debugLog('render:media-resolved', {
            source: chosenSource,
            fileType: fileType,
            mediaResolved: resolvedMedia,
            scormIndex: scormIndex
          });
          return {
            resolvedMedia: resolvedMedia,
            chosenSource: chosenSource,
            chosenFileType: fileType,
            itemId: itemId,
            scormIndex: scormIndex,
            chosenSummary: chosenSummary,
            chosenContent: chosenContent,
            stateMeta: {
              sessionDate: sessionDate,
              sessionDuration: sessionDuration,
              sessionJoinWindow: sessionJoinWindow,
              sessionStatus: sessionStatus,
              quizTime: quizTime,
              quizQuestions: quizQuestions,
              quizPassMark: quizPassMark,
              quizAttempts: quizAttempts,
              quizStatus: quizStatus,
              assignmentDeadline: assignmentDeadline,
              assignmentPassGrade: assignmentPassGrade,
              assignmentAttempts: assignmentAttempts,
              assignmentStatus: assignmentStatus
            }
          };
        });
      })
      .then(function (state) {
        if (token !== renderToken) return;
        var predictedRenderMode = inferRenderModeByItem(type, state.chosenSource, state.resolvedMedia, state.chosenFileType, state.chosenSummary, state.chosenContent);
        if (stage) stage.setAttribute('data-render-mode', predictedRenderMode);
        if (stage) stage.innerHTML = buildMediaHtml(state.resolvedMedia, state.chosenSource, type, title, state.chosenFileType, state.itemId, state.scormIndex, state.chosenSummary, state.chosenContent, state.stateMeta || {});
        var renderMode = inferRenderMode();
        if (stage) stage.setAttribute('data-render-mode', renderMode);
        cleanupDuplicatedLoaders();
        setPlayerLoadingState(false);
        debugLog('render:media-html-built', {
          source: state.chosenSource,
          fileType: state.chosenFileType,
          media: state.resolvedMedia,
          renderMode: renderMode
        });
        initInternalVideoPlayer();
      })
      .catch(function (error) {
        if (token !== renderToken) return;
        setPlayerLoadingState(false);
        debugLog('render:error', {
          message: error && error.message ? error.message : 'unknown'
        });
        if (stage) stage.innerHTML = '<div class="learning-player-placeholder"><i class="fa-regular fa-circle-xmark"></i><p>Impossible de charger ce contenu.</p></div>';
        cleanupDuplicatedLoaders();
        destroyVideoJsPlayer();
      });
  }

  function fetchItemInfo(type, itemId) {
    if (!courseId || !type || !itemId) return Promise.resolve(null);
    return fetch('/learning/itemInfo', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: type, id: itemId, course_id: courseId }),
      redirect: 'manual'
    })
      .then(function (r) {
        debugLog('fetchItemInfo:response', {
          status: r ? r.status : null,
          type: r ? r.type : null
        });
        if (!r || r.type === 'opaqueredirect' || r.status >= 300) return null;
        var ct = String(r.headers.get('content-type') || '').toLowerCase();
        if (!r.ok || ct.indexOf('application/json') === -1) return null;
        return r.json();
      })
      .catch(function (error) {
        debugLog('fetchItemInfo:error', { message: error && error.message ? error.message : 'unknown' });
        return null;
      });
  }

  function loadPersonalNote(type, itemId) {
    if (!noteEl) return;
    noteEl.value = '';
    if (!courseId || !type || !itemId) return;
    fetch('/learning/personalNotes?course_id=' + encodeURIComponent(courseId) + '&item_type=' + encodeURIComponent(type) + '&item_id=' + encodeURIComponent(itemId), {
      credentials: 'same-origin',
      redirect: 'manual'
    })
      .then(function (r) {
        if (!r || r.type === 'opaqueredirect' || r.status >= 300) return null;
        var ct = String(r.headers.get('content-type') || '').toLowerCase();
        if (!r.ok || ct.indexOf('application/json') === -1) return null;
        return r.json();
      })
      .then(function (data) {
        if (!noteEl) return;
        noteEl.value = data && typeof data.note === 'string' ? data.note : '';
      })
      .catch(function () {
        if (noteEl) noteEl.value = '';
      });
  }

  function savePersonalNote() {
    if (!noteEl) return;
    var btn = itemButtons[current];
    var type = String(btn.getAttribute('data-item-type') || '').trim();
    var itemId = String(btn.getAttribute('data-item-id') || '').trim();
    if (!courseId || !type || !itemId) return;
    var note = String(noteEl.value || '');

    fetch('/learning/personalNotes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ course_id: courseId, item_type: type, item_id: itemId, note: note })
    }).catch(function () {});
  }

  function escapeHtml(input) {
    return String(input || '').replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function toAbsoluteMedia(path) {
    var raw = String(path || '').trim();
    if (!raw) return '';
    if (/^<iframe[\s\S]*<\/iframe>$/i.test(raw) || /^<iframe[\s\S]*>$/i.test(raw)) {
      var srcMatch = raw.match(/src=["']([^"']+)["']/i);
      raw = srcMatch && srcMatch[1] ? String(srcMatch[1]).trim() : '';
      if (!raw) return '';
    }
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return raw;
    return '/' + raw.replace(/^\/+/, '');
  }

  function resolvePlayableMedia(path) {
    var raw = String(path || '').trim();
    debugLog('resolvePlayableMedia:input', { raw: raw });
    if (!raw) return Promise.resolve('');
    if (/^https?:\/\//i.test(raw)) {
      if (/x-amz-algorithm=aws4-hmac-sha256/i.test(raw)) {
        return fetch('/admin/library/presign?key=' + encodeURIComponent(raw), {
          credentials: 'same-origin',
          redirect: 'manual'
        })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            if (data && data.previewUrl) return String(data.previewUrl);
            return raw;
          })
          .catch(function (error) {
            debugLog('resolvePlayableMedia:presign-url-error', { message: error && error.message ? error.message : 'unknown' });
            return raw;
          });
      }
      return Promise.resolve(raw);
    }
    if (raw.startsWith('/')) return Promise.resolve(raw);

    var looksLikeLibraryKey = /^Library\//i.test(raw) || /^Fintrax\/Library\//i.test(raw);
    return fetch('/admin/library/presign?key=' + encodeURIComponent(raw), {
      credentials: 'same-origin',
      redirect: 'manual'
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.previewUrl) return String(data.previewUrl);
        return looksLikeLibraryKey ? '' : raw;
      })
      .catch(function (error) {
        debugLog('resolvePlayableMedia:presign-key-error', { message: error && error.message ? error.message : 'unknown' });
        return looksLikeLibraryKey ? '' : raw;
      });
  }

  function buildMediaHtml(mediaPath, source, type, title, fileType, itemId, scormIndex, summary, contentHtml, stateMeta) {
    function placeholder(iconClass, titleText, bodyText, ctaHref, ctaLabel, variantClass) {
      var ctaTarget = '';
      var ctaRel = '';
      if (ctaHref && !/^#/.test(String(ctaHref))) {
        ctaTarget = ' target="_blank"';
        ctaRel = ' rel="noopener"';
      }
      return '<div class="learning-player-placeholder ' + escapeHtml(variantClass || 'is-generic') + '">' +
        '<div class="learning-player-placeholder-icon"><i class="' + escapeHtml(iconClass || 'fa-regular fa-circle-play') + '"></i></div>' +
        '<p class="learning-player-placeholder-title"><strong>' + escapeHtml(titleText || 'Contenu indisponible') + '</strong></p>' +
        (bodyText ? ('<p class="learning-player-placeholder-body small text-muted">' + escapeHtml(bodyText) + '</p>') : '') +
        (ctaHref && ctaLabel
          ? ('<p><a class="btn btn-sm btn-primary learning-player-placeholder-cta" href="' + escapeHtml(ctaHref) + '"' + ctaTarget + ctaRel + '>' + escapeHtml(ctaLabel) + '</a></p>')
          : '') +
      '</div>';
    }

    var media = toAbsoluteMedia(mediaPath);
    function framedEmbed(src, titleText) {
      var safeSrc = escapeHtml(src || '');
      var safeTitleText = escapeHtml(titleText || 'Document');
      return '<div class="learning-embed-frame-wrap">' +
        '<div class="learning-embed-frame-actions">' +
          '<a class="learning-embed-action-btn" href="' + safeSrc + '" target="_blank" rel="noopener" title="Open in new tab" aria-label="Open in new tab"><i class="fa-solid fa-up-right-from-square"></i></a>' +
          '<a class="learning-embed-action-btn" href="' + safeSrc + '" target="_blank" rel="noopener" title="Download" aria-label="Download"><i class="fa-solid fa-download"></i></a>' +
        '</div>' +
        '<iframe class="pdf-view" src="' + safeSrc + '" title="' + safeTitleText + '"></iframe>' +
      '</div>';
    }
    function toGoogleDriveEmbed(url) {
      var raw = String(url || '');
      if (!raw) return '';
      var m1 = raw.match(/\/file\/d\/([^/]+)/i);
      if (m1 && m1[1]) return 'https://drive.google.com/file/d/' + m1[1] + '/preview';
      var m2 = raw.match(/[?&]id=([^&]+)/i);
      if (m2 && m2[1]) return 'https://drive.google.com/file/d/' + m2[1] + '/preview';
      return raw;
    }
    var meta = stateMeta && typeof stateMeta === 'object' ? stateMeta : {};
    var toNum = function (v, fallback) {
      var n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    var parseDate = function (value) {
      var raw = String(value || '').trim();
      if (!raw) return null;
      var d = new Date(raw);
      if (Number.isNaN(d.getTime())) return null;
      return d;
    };
    var prettyDate = function (date) {
      if (!date) return '-';
      try {
        return new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
      } catch (_) {
        return date.toISOString();
      }
    };
    var sessionDateObj = parseDate(meta.sessionDate);
    var sessionDurationMin = toNum(meta.sessionDuration, 0);
    var sessionJoinWindowMin = toNum(meta.sessionJoinWindow, 0);
    var sessionStatusRaw = String(meta.sessionStatus || '').toLowerCase();
    var now = new Date();
    var sessionEndDate = sessionDateObj ? new Date(sessionDateObj.getTime() + Math.max(sessionDurationMin, 1) * 60000 + Math.max(sessionJoinWindowMin, 0) * 60000) : null;
    var computedSessionState = sessionStatusRaw;
    if (!computedSessionState || computedSessionState === 'active') {
      if (!sessionDateObj) computedSessionState = 'upcoming';
      else if (now < sessionDateObj) computedSessionState = 'upcoming';
      else if (sessionEndDate && now > sessionEndDate) computedSessionState = 'ended';
      else computedSessionState = 'live';
    }
    var assignmentDeadlineObj = parseDate(meta.assignmentDeadline);
    var assignmentStatusRaw = String(meta.assignmentStatus || '').toLowerCase();
    var assignmentState = assignmentStatusRaw || (assignmentDeadlineObj && now > assignmentDeadlineObj ? 'expired' : 'open');
    var quizQuestionsNum = Math.max(0, toNum(meta.quizQuestions, 0));
    var quizPassNum = Math.max(0, toNum(meta.quizPassMark, 0));
    var quizAttemptsNum = Math.max(0, toNum(meta.quizAttempts, 0));
    var quizTimeNum = Math.max(0, toNum(meta.quizTime, 0));
    var quizStatusRaw = String(meta.quizStatus || '').toLowerCase();
    var normalizedSummary = String(summary || '').trim();
    var normalizedContent = String(contentHtml || '').trim();

    if (String(type || '') === 'session') {
      var sessionStateLabel = computedSessionState === 'ended' ? 'Session ended' : (computedSessionState === 'live' ? 'Session live' : 'Session upcoming');
      var sessionStateClass = computedSessionState === 'ended' ? 'is-ended' : (computedSessionState === 'live' ? 'is-live' : 'is-upcoming');
      var canJoin = computedSessionState === 'live' && /^https?:\/\//i.test(String(media || ''));
      var canPreview = computedSessionState === 'upcoming' && /^https?:\/\//i.test(String(media || ''));
      return '<div class="learning-state-card learning-session-state ' + sessionStateClass + '">' +
        '<div class="state-icon"><i class="fa-regular fa-calendar"></i></div>' +
        '<h3>' + escapeHtml(sessionStateLabel) + '</h3>' +
        '<p class="state-sub">' + escapeHtml(computedSessionState === 'ended' ? 'This live session has ended and can no longer be joined.' : (computedSessionState === 'live' ? 'The live session is currently running.' : 'The live session has not started yet.')) + '</p>' +
        '<div class="state-metrics">' +
          '<span><strong>Start Date</strong> ' + escapeHtml(prettyDate(sessionDateObj)) + '</span>' +
          '<span><strong>Duration</strong> ' + escapeHtml(String(sessionDurationMin || '-')) + ' Minutes</span>' +
        '</div>' +
        (canJoin ? ('<p><a class="btn btn-sm btn-primary learning-player-placeholder-cta" href="' + escapeHtml(media) + '" target="_blank" rel="noopener">Join session</a></p>') : '') +
        (!canJoin && canPreview ? ('<p><a class="btn btn-sm btn-outline-light learning-player-placeholder-cta" href="' + escapeHtml(media) + '" target="_blank" rel="noopener">Open meeting link</a></p>') : '') +
      '</div>';
    }

    if (String(type || '') === 'quiz') {
      var quizStatusLabel = quizStatusRaw || 'not participated';
      return '<div class="learning-state-card learning-quiz-state">' +
        '<div class="state-icon"><i class="fa-regular fa-clipboard"></i></div>' +
        '<h3>Entrance Quiz</h3>' +
        '<p class="state-sub">Test your knowledge and see where you stand to pass this course.</p>' +
        '<div class="state-metrics">' +
          '<span><strong>Quiz Time</strong> ' + escapeHtml(String(quizTimeNum || 10)) + ' min</span>' +
          '<span><strong>Questions</strong> ' + escapeHtml(String(quizQuestionsNum || 0)) + '</span>' +
          '<span><strong>Passing Score</strong> ' + escapeHtml(String(quizPassNum || 70)) + '/100</span>' +
          '<span><strong>Attempts</strong> ' + escapeHtml(String(quizAttemptsNum || 0)) + '</span>' +
        '</div>' +
        '<p class="state-sub">Status: <strong>' + escapeHtml(quizStatusLabel) + '</strong></p>' +
        '<p><a class="btn btn-sm btn-primary learning-player-placeholder-cta" href="#quizzes">View Quiz</a></p>' +
      '</div>';
    }

    if (String(type || '') === 'assignment') {
      return '<div class="learning-state-card learning-assignment-state ' + (assignmentState === 'expired' ? 'is-ended' : 'is-open') + '">' +
        '<div class="state-icon"><i class="fa-regular fa-bookmark"></i></div>' +
        '<h3>' + escapeHtml(assignmentState === 'expired' ? 'Deadline passed' : 'Assignment open') + '</h3>' +
        '<p class="state-sub">' + escapeHtml(assignmentState === 'expired' ? 'You cannot submit files after the deadline.' : 'Read the assignment brief and submit your work before deadline.') + '</p>' +
        '<div class="state-metrics">' +
          '<span><strong>Deadline</strong> ' + escapeHtml(prettyDate(assignmentDeadlineObj)) + '</span>' +
          '<span><strong>Pass Grade</strong> ' + escapeHtml(String(Math.max(0, toNum(meta.assignmentPassGrade, 0)) || '-')) + '</span>' +
          '<span><strong>Attempts</strong> ' + escapeHtml(String(Math.max(0, assignmentAttemptsNum) || '-')) + '</span>' +
        '</div>' +
        (/^https?:\/\//i.test(String(media || '')) ? ('<p><a class="btn btn-sm btn-primary learning-player-placeholder-cta" href="' + escapeHtml(media) + '" target="_blank" rel="noopener">Open assignment brief</a></p>') : '') +
      '</div>';
    }

    if (!media) {
      if (String(type || '') === 'text_lesson' && (normalizedSummary || normalizedContent)) {
        return '<article class="learning-text-lesson-article">' +
          (normalizedSummary ? ('<div class="learning-text-lesson-summary">' + escapeHtml(normalizedSummary) + '</div>') : '') +
          (normalizedContent ? ('<div class="learning-text-lesson-content">' + normalizedContent + '</div>') : '') +
        '</article>';
      }
      if (String(type || '') === 'session') {
        return placeholder('fa-regular fa-calendar', 'Session non planifiée', 'Aucun lien de session live n est encore disponible pour ce contenu.', '', '', 'is-live');
      }
      if (String(type || '') === 'quiz') {
        return placeholder('fa-regular fa-clipboard', 'Quiz prêt', 'Ouvrez ce quiz depuis l onglet Quiz pour démarrer la tentative.', '', '', 'is-quiz');
      }
      if (String(type || '') === 'assignment') {
        return placeholder('fa-regular fa-bookmark', 'Devoir prêt', 'Consultez les consignes puis envoyez votre soumission.', '', '', 'is-assignment');
      }
      if (String(type || '') === 'interactive_file') {
        return placeholder('fa-regular fa-file-zipper', 'SCORM indisponible', 'Le package SCORM est présent mais aucun index exécutable n a été détecté.', '', '', 'is-scorm');
      }
      return placeholder('fa-regular fa-circle-play', 'Contenu indisponible', 'Aucune ressource média exploitable n a été détectée pour cet élément.', '', '', 'is-generic');
    }

    var safeTitle = escapeHtml(title || 'Contenu');
    var normalizedFileType = String(fileType || '').toLowerCase();
    var normalizedScormIndex = String(scormIndex || '').trim();
    var isAudioByExt = /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(media);
    var isAudioByType = normalizedFileType === 'audio' || normalizedFileType === 'sound';

    if (type === 'interactive_file') {
      if (/\.html?(\?|#|$)/i.test(media) || source === 'iframe') {
        return framedEmbed(media, safeTitle);
      }
      if (/\.zip(\?|#|$)/i.test(media)) {
        return placeholder(
          'fa-regular fa-file-zipper',
          'Package SCORM ZIP détecté',
          'Le package a été trouvé, mais il faut un index HTML (ex: index_lms.html ou scorm.html) pour un lancement direct.',
          media,
          'Ouvrir le ZIP',
          'is-scorm'
        );
      }
      if (normalizedScormIndex) {
        return placeholder(
          'fa-regular fa-file-lines',
          'Index SCORM détecté: ' + normalizedScormIndex,
          'Le package peut être lancé via cet index.',
          media,
          'Ouvrir le contenu SCORM',
          'is-scorm'
        );
      }
    }

    if (source === 'google_drive') {
      var driveUrl = toGoogleDriveEmbed(media);
      if (driveUrl) return framedEmbed(driveUrl, safeTitle);
    }

    if (source === 'iframe') {
      if (media) return framedEmbed(media, safeTitle);
      return placeholder('fa-regular fa-window-maximize', 'iFrame unavailable', 'The iframe source is empty.', '', '', 'is-file');
    }

    if (source === 'youtube' || /youtube\.com|youtu\.be/i.test(media)) {
      return '<video id="learningVideoPlayer" class="video-js vjs-paused vjs-default-skin" controls preload="auto" controlsList="nodownload" playsinline>'
        + '<source src="' + escapeHtml(media) + '" type="video/youtube"></video>';
    }

    if (source === 'vimeo' || /vimeo\.com/i.test(media)) {
      return '<video id="learningVideoPlayer" class="video-js vjs-paused vjs-default-skin" controls preload="auto" controlsList="nodownload" playsinline>'
        + '<source src="' + escapeHtml(media) + '" type="video/vimeo"></video>';
    }

    if (/\.(png|jpe?g|gif|webp|svg)$/i.test(media)) {
      return '<img src="' + escapeHtml(media) + '" alt="' + safeTitle + '">';
    }

    if (isAudioByExt || isAudioByType) {
      return '<div class="learning-audio-wrap">'
        + '<audio id="learningAudioPlayer" class="w-100" controls preload="auto" controlsList="nodownload">'
        + '<source src="' + escapeHtml(media) + '" type="audio/mpeg">'
        + 'Votre navigateur ne supporte pas la lecture audio.'
        + '</audio>'
        + '</div>';
    }

    var isVideoByExt = /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?|#|$)/i.test(media);
    var isVideoByType = normalizedFileType === 'video';
    var isSession = String(type || '') === 'session';
    if (isSession && !isVideoByExt && !isVideoByType) {
      if (/^https?:\/\//i.test(media)) {
        return framedEmbed(media, safeTitle);
      }
      return placeholder('fa-regular fa-calendar', 'Ouvrir la session', 'Rejoignez la session live avec le lien configuré.', media, 'Ouvrir la session', 'is-live');
    }
    if (isVideoByExt || isVideoByType) {
      var videoId = 'videoPlayer' + String(itemId || 'Inline');
      return '<video id="' + escapeHtml(videoId) + '" class="video-js vjs-paused vjs-default-skin ' + escapeHtml(videoId) + '-dimensions" controls preload="auto" controlsList="nodownload" playsinline>'
        + '<source src="' + escapeHtml(media) + '" type="' + (/\.m3u8(\?|#|$)/i.test(media) ? 'application/x-mpegURL' : 'video/mp4') + '">'
        + 'Votre navigateur ne supporte pas la lecture vidéo.'
        + '</video>';
    }

    if (/\.pdf(\?|#|$)/i.test(media)) {
      return framedEmbed(media, safeTitle);
    }

    if (/\.(ppt|pptx|doc|docx|xls|xlsx)(\?|#|$)/i.test(media)) {
      return framedEmbed(media, safeTitle);
    }

    return placeholder('fa-regular fa-file-lines', safeTitle, 'Ce type de contenu est disponible dans un nouvel onglet.', media, 'Ouvrir le contenu', 'is-file');
  }

  function deriveScormEntryCandidates(path, scormIndex) {
    var raw = String(path || '').trim();
    var indexFile = String(scormIndex || '').trim();
    if (!raw) return [];

    var candidates = [];
    var indexCandidates = indexFile
      ? [indexFile]
      : [
          'index_lms.html',
          'indexapi.html',
          'index_scorm.html',
          'scormdriver/indexapi.html',
          'story.html',
          'story_html5.html',
          'launch.html',
          'start.html',
          'player.html',
          'scorm.html',
          'index.html'
        ];

    indexCandidates.forEach(function (idx) {
      if (/^https?:\/\//i.test(raw)) {
        candidates.push(raw.replace(/\.zip(\?.*)?$/i, '/' + idx));
        candidates.push(raw.replace(/\/[^\/?#]+(\?.*)?$/i, '/' + idx));
      } else {
        candidates.push(raw.replace(/\.zip$/i, '/' + idx));
        candidates.push(raw.replace(/\/[^\/]+$/i, '/' + idx));
      }
      candidates.push(raw + '/' + idx);
      candidates.push(raw.replace(/\/$/, '') + '/' + idx);
    });

    if (indexFile) {
      if (/^https?:\/\//i.test(raw)) {
        candidates.push(raw.replace(/\/[^\/?#]+(\?.*)?$/i, '/' + indexFile));
      } else {
        candidates.push(raw.replace(/\/[^\/]+$/i, '/' + indexFile));
      }
    }

    var uniq = {};
    return candidates.filter(function (x) {
      var k = String(x || '').trim();
      if (!k) return false;
      if (uniq[k]) return false;
      uniq[k] = true;
      return true;
    });
  }

  function resolveScormPlayableMedia(path, type, scormIndex) {
    if (String(type || '') !== 'interactive_file') {
      return resolvePlayableMedia(path);
    }

    var rawPath = String(path || '').trim();
    if (/\.zip(\?|#|$)/i.test(rawPath)) {
      return fetch('/admin/library/scorm/resolve?key=' + encodeURIComponent(rawPath) + '&index=' + encodeURIComponent(String(scormIndex || '')), {
        credentials: 'same-origin',
        redirect: 'manual'
      })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (data && data.previewUrl) return String(data.previewUrl);
          if (data && data.key) return resolvePlayableMedia(String(data.key));
          return resolvePlayableMedia(path);
        })
        .catch(function () {
          return resolvePlayableMedia(path);
        });
    }

    var candidates = deriveScormEntryCandidates(path, scormIndex);
    if (!candidates.length) {
      return resolvePlayableMedia(path);
    }

    return Promise.all(
      candidates.map(function (candidate) {
        return resolvePlayableMedia(candidate).catch(function () { return ''; });
      })
    ).then(function (resolvedList) {
      for (var i = 0; i < resolvedList.length; i += 1) {
        var resolved = String(resolvedList[i] || '').trim();
        if (!resolved) continue;
        if (/\.zip(\?|#|$)/i.test(resolved)) continue;
        if (/\.html?(\?|#|$)/i.test(resolved)) return resolved;
      }
      for (var j = 0; j < resolvedList.length; j += 1) {
        var fallback = String(resolvedList[j] || '').trim();
        if (fallback && !/\.zip(\?|#|$)/i.test(fallback)) return fallback;
      }
      return resolvePlayableMedia(path);
    }).catch(function () {
      return resolvePlayableMedia(path);
    });
  }

  function appendQuery(url, params) {
    var raw = String(url || '');
    if (!raw) return raw;
    try {
      var u = new URL(raw, window.location.origin);
      Object.keys(params || {}).forEach(function (k) {
        if (!u.searchParams.has(k)) u.searchParams.set(k, String(params[k]));
      });
      if (/^https?:\/\//i.test(raw)) return u.toString();
      return u.pathname + u.search + u.hash;
    } catch (_) {
      var sep = raw.indexOf('?') >= 0 ? '&' : '?';
      var query = Object.keys(params || {})
        .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(String(params[k])); })
        .join('&');
      return query ? raw + sep + query : raw;
    }
  }

  function destroyVideoJsPlayer() {
    if (videoJsPlayer && typeof videoJsPlayer.dispose === 'function') {
      try { videoJsPlayer.dispose(); } catch (_) {}
    }
    videoJsPlayer = null;
  }

  function initInternalVideoPlayer() {
    destroyVideoJsPlayer();
    if (!stage) return;

    var nativeAudio = stage.querySelector('#learningAudioPlayer');
    if (nativeAudio && typeof nativeAudio.play === 'function') {
      debugLog('player:init-native-audio', { src: nativeAudio.currentSrc || nativeAudio.src || '' });
      nativeAudio.addEventListener('loadedmetadata', function () {
        debugLog('player:native-audio-loadedmetadata', {
          duration: Number(nativeAudio.duration || 0),
          readyState: Number(nativeAudio.readyState || 0)
        });
      }, { once: true });
      nativeAudio.addEventListener('error', function () {
        var err = nativeAudio.error;
        debugLog('player:native-audio-error', {
          code: err && err.code ? err.code : null,
          message: err && err.message ? err.message : null
        });
      }, { once: true });
      nativeAudio.autoplay = true;
      var nativeAudioAttempt = nativeAudio.play();
      if (nativeAudioAttempt && typeof nativeAudioAttempt.catch === 'function') {
        nativeAudioAttempt.catch(function (error) {
          debugLog('player:native-audio-play-rejected', {
            message: error && error.message ? error.message : 'unknown'
          });
        });
      }
      return;
    }

    var video = stage.querySelector('video.video-js');
    if (!video) return;
    if (typeof window.videojs !== 'function') return;
    var sourceTag = video.querySelector('source');
    var sourceType = String(sourceTag && sourceTag.getAttribute('type') || '').toLowerCase();
    var sourceUrl = String(sourceTag && sourceTag.getAttribute('src') || video.currentSrc || video.src || '');
    var isYouTube = sourceType === 'video/youtube' || /youtube\.com|youtu\.be/i.test(sourceUrl);
    var isVimeo = sourceType === 'video/vimeo' || /vimeo\.com/i.test(sourceUrl);
    var techOrder = isYouTube ? ['youtube', 'html5'] : (isVimeo ? ['vimeo', 'html5'] : ['html5']);
    debugLog('player:init-videojs', {
      src: sourceUrl,
      sourceType: sourceType,
      techOrder: techOrder
    });

    videoJsPlayer = window.videojs(video, {
      controls: true,
      autoplay: true,
      preload: 'auto',
      fluid: true,
      techOrder: techOrder,
      normalizeAutoplay: true,
      playbackRates: [0.75, 1, 1.25, 1.5, 2],
      controlBar: {
        volumePanel: { inline: false }
      }
    });

    videoJsPlayer.on('loadedmetadata', function () {
      applyResponsiveMediaFit();
      setPlayerLoadingState(false);
      debugLog('player:videojs-loadedmetadata', {
        duration: Number(videoJsPlayer.duration() || 0),
        currentSrc: String(videoJsPlayer.currentSrc() || '')
      });
    });
    videoJsPlayer.on('canplay', function () {
      applyResponsiveMediaFit();
      setPlayerLoadingState(false);
      debugLog('player:videojs-canplay', {});
    });
    videoJsPlayer.on('playing', function () {
      setPlayerLoadingState(false);
      debugLog('player:videojs-playing', {
        currentTime: Number(videoJsPlayer.currentTime() || 0)
      });
    });
    videoJsPlayer.on('waiting', function () {
      debugLog('player:videojs-waiting', {});
    });
    videoJsPlayer.on('stalled', function () {
      debugLog('player:videojs-stalled', {});
    });
    videoJsPlayer.on('error', function () {
      var err = videoJsPlayer.error && videoJsPlayer.error();
      debugLog('player:videojs-error', {
        code: err && err.code ? err.code : null,
        message: err && err.message ? err.message : null
      });
    });

    videoJsPlayer.ready(function () {
      debugLog('player:videojs-ready', {});
      var autoPlayAttempt = videoJsPlayer.play();
      if (autoPlayAttempt && typeof autoPlayAttempt.catch === 'function') {
        autoPlayAttempt.catch(function (error) {
          debugLog('player:videojs-play-rejected', {
            message: error && error.message ? error.message : 'unknown'
          });
          try {
            videoJsPlayer.muted(true);
            var mutedAttempt = videoJsPlayer.play();
            if (mutedAttempt && typeof mutedAttempt.catch === 'function') {
              mutedAttempt.catch(function (error2) {
                debugLog('player:videojs-muted-play-rejected', {
                  message: error2 && error2.message ? error2.message : 'unknown'
                });
              });
            }
          } catch (_) {}
        });
      }

      window.setTimeout(function () {
        if (!videoJsPlayer || typeof videoJsPlayer.paused !== 'function') return;
        if (!videoJsPlayer.paused()) return;
        debugLog('player:videojs-watchdog-retry', {
          currentSrc: String(videoJsPlayer.currentSrc() || '')
        });
        try {
          videoJsPlayer.load();
          var retryAttempt = videoJsPlayer.play();
          if (retryAttempt && typeof retryAttempt.catch === 'function') {
            retryAttempt.catch(function (error) {
              debugLog('player:videojs-watchdog-retry-failed', {
                message: error && error.message ? error.message : 'unknown'
              });
            });
          }
        } catch (error) {
          debugLog('player:videojs-watchdog-error', {
            message: error && error.message ? error.message : 'unknown'
          });
        }
      }, 2500);
    });
  }

  function markDone() {
    var btn = itemButtons[current];
    var key = String(btn.getAttribute('data-item-key') || '');
    if (!key || isDone(key)) return;
    completed[key] = true;
    try { window.localStorage.setItem(storageKey, JSON.stringify(completed)); } catch (_) {}
    updateProgress();
    if (passToggle) {
      passToggle.classList.add('is-on');
      passToggle.setAttribute('aria-pressed', 'true');
    }
    if (doneBtn) {
      doneBtn.disabled = true;
      doneBtn.textContent = 'Deja termine';
    }
  }

  function applyContentSearchFilter() {
    if (!contentSearchInput) return;
    var query = String(contentSearchInput.value || '').trim().toLowerCase();
    var total = 0;
    var shown = 0;

    itemButtons.forEach(function (btn) {
      total += 1;
      var sectionTitle = String(btn.getAttribute('data-item-section') || '').toLowerCase();
      var itemTitle = String(btn.getAttribute('data-item-title') || '').toLowerCase();
      var itemType = String(btn.getAttribute('data-item-type') || '').toLowerCase();
      var itemDesc = String(btn.getAttribute('data-item-desc') || '').toLowerCase();
      var haystack = [sectionTitle, itemTitle, itemType, itemDesc].join(' ');
      var keep = !query || haystack.indexOf(query) >= 0;
      btn.classList.toggle('learning-item-hidden', !keep);
      if (keep) shown += 1;
    });

    Array.prototype.slice.call(document.querySelectorAll('.section-card')).forEach(function (card) {
      var visibleItems = card.querySelectorAll('.js-learning-item:not(.learning-item-hidden)').length;
      card.classList.toggle('learning-item-hidden', visibleItems === 0);
      if (query && visibleItems > 0) card.classList.add('is-open');
    });

    if (contentSearchMeta) {
      contentSearchMeta.textContent = query ? (String(shown) + ' resultat(s) sur ' + String(total)) : '';
    }
  }

  itemButtons.forEach(function (btn, i) {
    btn.addEventListener('click', function () {
      btn.classList.add('is-pressing');
      window.setTimeout(function () { btn.classList.remove('is-pressing'); }, 180);
      render(i);
    });
    var perItemToggle = btn.querySelector('.js-passed-lesson-toggle');
    if (perItemToggle) {
      perItemToggle.addEventListener('click', function (event) {
        event.stopPropagation();
      });
      perItemToggle.addEventListener('change', function () {
        var key = String(btn.getAttribute('data-item-key') || '');
        if (!key) return;
        if (perItemToggle.checked) completed[key] = true;
        else delete completed[key];
        try { window.localStorage.setItem(storageKey, JSON.stringify(completed)); } catch (_) {}
        updateProgress();
      });
    }

    Array.prototype.slice.call(btn.querySelectorAll('.js-item-action')).forEach(function (actionBtn) {
      actionBtn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        handleItemAction(actionBtn);
      });
    });
  });

  if (prevBtn) prevBtn.addEventListener('click', function () { render(current - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { render(current + 1); });
  if (doneBtn) doneBtn.addEventListener('click', markDone);
  if (passToggle) passToggle.addEventListener('click', markDone);
  if (saveNoteBtn) saveNoteBtn.addEventListener('click', savePersonalNote);
  initResumeButton();
  bindKeyboardShortcuts();

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function (event) {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      tab.classList.add('is-pressing');
      window.setTimeout(function () { tab.classList.remove('is-pressing'); }, 160);
      var target = String(tab.getAttribute('data-tab') || '');
      try {
        var u = new URL(window.location.href);
        u.searchParams.set('tab', target);
        window.history.replaceState({}, '', u.pathname + u.search + u.hash);
      } catch (_) {}
      tabs.forEach(function (t) {
        t.classList.toggle('is-active', t === tab);
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      panels.forEach(function (panel) {
        var isTarget = String(panel.getAttribute('data-panel') || '') === target;
        panel.classList.toggle('active', isTarget);
        panel.classList.toggle('show', isTarget);
        panel.classList.toggle('d-none', !isTarget);
      });
    });
  });

  toggles.forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      var card = toggle.closest('.section-card');
      if (!card) return;
      card.classList.toggle('is-open');
      card.classList.add('is-toggling');
      window.setTimeout(function () { card.classList.remove('is-toggling'); }, 240);
    });
  });

  if (contentSearchInput) {
    contentSearchInput.addEventListener('input', applyContentSearchFilter);
  }

  if (content) {
    content.addEventListener('click', function (event) {
      var link = event.target && event.target.closest ? event.target.closest('a[href="#quizzes"]') : null;
      if (!link) return;
      event.preventDefault();
      activateTab('quizzes');
    });
  }

  addBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var type = String(btn.getAttribute('data-add-type') || 'item');
      var sectionId = String(btn.getAttribute('data-section-id') || '');
      var tab = addTypeToTab[type] || 'curriculum';
      var qs = '?tab=' + encodeURIComponent(tab)
        + '&openCreate=' + encodeURIComponent(type)
        + '&fromLearning=1'
        + '&sectionId=' + encodeURIComponent(sectionId);
      if (!courseId) return;
      window.location.href = '/admin/webinars/' + encodeURIComponent(courseId) + '/edit' + qs;
    });
  });

  sectionActionBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!courseId) return;
      var action = String(btn.getAttribute('data-action') || '');
      var sectionId = String(btn.getAttribute('data-section-id') || '');
      var qs = '?tab=curriculum'
        + '&sectionAction=' + encodeURIComponent(action)
        + '&fromLearning=1'
        + '&sectionId=' + encodeURIComponent(sectionId);
      window.location.href = '/admin/webinars/' + encodeURIComponent(courseId) + '/edit' + qs;
    });
  });

  if (collapseBtn && tabsContainer) {
    collapseBtn.addEventListener('click', function () {
      tabsContainer.classList.toggle('show');
    });
  }

  window.setTimeout(function () {
    setPlayerLoadingState(false);
    cleanupDuplicatedLoaders();
    removeLoadingNodeIfContentVisible();
    updateProgress();
    render(resolveInitialIndex());
    syncStageViewportHeight();
    try {
      var params = new URLSearchParams(window.location.search || '');
      var initialTab = String(params.get('tab') || '').trim();
      var targetTab = null;
      if (initialTab) {
        targetTab = tabs.find(function (t) { return String(t.getAttribute('data-tab') || '') === initialTab; }) || null;
      }
      if (!targetTab && tabs.length) targetTab = tabs[0];
      if (targetTab) targetTab.click();
    } catch (_) {}
  }, 450);

  if (typeof window.MutationObserver === 'function' && content) {
    var visibilityObserver = new MutationObserver(function () {
      removeLoadingNodeIfContentVisible();
    });
    visibilityObserver.observe(content, {
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-hidden']
    });
    if (stage) {
      visibilityObserver.observe(stage, {
        childList: true,
        subtree: true
      });
    }
  }
})();
