window.onload = function() {
  var appName = document.title;
  var canvas = document.getElementById('mainCanvas');
  var context = canvas.getContext('2d');
  var stageWidth = 360;
  var stageHeight = 480;
  var scale;
  var margin = 10;
  var titleLabelRect;
  var levelButtonRects = new Array(3);
  var helpButtonRect;
  var quitButtonRect;
  var countLabelRect;
  var hintButtonRect;
  var retryButtonRect;
  var doneButtonRect;
  var undoButtonRect;
  var boardRect;
  var stackButtonRects;
  var pieceRectTable;
  var kindColors = ['blue', 'red', 'yellow', 'lime'];
  var stackNames = ['1', '2', '3', '4', '5'];
  var sceneHome = 0;
  var scenePlay = 1;
  var sceneResult = 2;
  var sceneCompleted = 3;
  var scene;
  var cursorIndex = -1;
  var stackCount;
  var boardCode;
  var routeLimit;
  var board;
  var popIndex;
  var pushIndex;
  var moves;
  var notificationId = 0;
  var notificationText;
  var notificationColor;
  var notificationRect;
  var successColor = '#99ffff';
  var completeColor = '#ffff99';
  var failureColor = '#ff99ff';
  var textColor = 'black';
  var recordTable = {};
  var hint;
  var hinting;

  (function() {
    var buttonWidth = (stageWidth - margin * 4) / 3;
    var buttonTop = (stageHeight - buttonWidth) / 2;
    titleLabelRect = new Rect(
      margin * 2 + buttonWidth,
      buttonTop - buttonWidth - margin,
      buttonWidth,
      buttonWidth
    );
    var buttonLeft = margin;
    for (var l = 0; l < levelButtonRects.length; l++) {
      levelButtonRects[l] = new Rect(
        buttonLeft,
        buttonTop,
        buttonWidth,
        buttonWidth
      );
      buttonLeft += buttonWidth + margin;
    }
    helpButtonRect = new Rect(
      margin * 2 + buttonWidth,
      buttonTop + buttonWidth + margin,
      buttonWidth,
      buttonWidth
    );

    var boardWidth = stageWidth - margin * 4;
    boardRect = new Rect(
      (stageWidth - boardWidth) / 2,
      (stageHeight - boardWidth) / 2,
      boardWidth,
      boardWidth
    );
    var buttonHeight = (stageHeight - boardRect.height - margin * 4) / 2;
    quitButtonRect = new Rect(margin, margin, buttonWidth, buttonHeight);
    countLabelRect = new Rect(
      margin * 2 + buttonWidth,
      margin,
      buttonWidth,
      buttonHeight
    );
    hintButtonRect = new Rect(
      margin * 3 + buttonWidth * 2,
      margin,
      buttonWidth,
      buttonHeight
    );
    buttonTop = stageHeight - buttonHeight - margin;
    retryButtonRect = new Rect(margin, buttonTop, buttonWidth, buttonHeight);
    doneButtonRect = new Rect(
      margin * 2 + buttonWidth,
      buttonTop,
      buttonWidth,
      buttonHeight
    );
    undoButtonRect = new Rect(
      margin * 3 + buttonWidth * 2,
      buttonTop,
      buttonWidth,
      buttonHeight
    );

    for (var s = 3; s <= 5; s++) {
      recordTable[s] = loadRecords(s);
    }

    addTouchStartListener(canvas, function(x, y) {
      onTouchStart(x / scale, y / scale);
    });
    addTouchMoveListener(canvas, function(x, y) {
      onTouchMove(x / scale, y / scale);
    });
    addTouchEndListener(canvas, function(x, y) {
      onTouchEnd(x / scale, y / scale);
    });
    window.onkeydown = onKeyDown;
    window.onresize = window.onorientationchange = onResize;
    resize();
    (window.onhashchange = onHashChange)();
    window.focus();
  })();

  function onResize() {
    resize();
    paint();
  }

  function resize() {
    scale = Math.min(
      window.innerWidth / stageWidth,
      window.innerHeight / stageHeight
    );
    canvas.width = stageWidth * scale;
    canvas.height = stageHeight * scale;
    context.scale(scale, scale);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '18px sans-serif';
    context.lineWidth = 2;
    context.lineJoin = 'bevel';
    context.strokeStyle = 'black';
  }

  function onHashChange() {
    boardCode = location.hash.slice(1);
    board = boardCodeToBoard(boardCode);
    if (board) {
      updateStackCount(board.length);
      goPlay();
      return;
    }
    goHome();
  }

  function updateStackCount(newStackCount) {
    stackCount = newStackCount;
    var stackWidth = boardRect.width / stackCount;
    var pieceWidth = stackWidth - margin;
    var pieceHeight = boardRect.height / (stackCount + 2);
    stackButtonRects = new Array(stackCount);
    pieceRectTable = new Array(stackCount);
    for (var i = 0; i < stackCount; i++) {
      var stackButtonRect = (stackButtonRects[i] = new Rect(
        boardRect.left + stackWidth * i,
        boardRect.bottom() - pieceHeight,
        stackWidth,
        pieceHeight
      ));
      var pieceRects = (pieceRectTable[i] = new Array(stackCount + 1));
      for (var j = 0; j <= stackCount; j++) {
        pieceRects[j] = new Rect(
          stackButtonRect.left + margin / 2,
          stackButtonRect.top - pieceHeight * (j + 1),
          pieceWidth,
          pieceHeight
        );
      }
    }
    var notificationWidth = boardRect.width - pieceWidth;
    notificationRect = new Rect(
      (stageWidth - notificationWidth) / 2,
      boardRect.top + pieceHeight / 2,
      notificationWidth,
      pieceHeight
    );
  }

  function onTouchStart(x, y) {
    if (hinting) {
      return;
    }
    if (scene === sceneHome) {
      for (var l = 0; l < levelButtonRects.length; l++) {
        if (levelButtonRects[l].contains(x, y)) {
          commandStart(l + 3);
          return;
        }
      }
      if (helpButtonRect.contains(x, y)) {
        commandHelp();
      }
      return;
    }
    var touchIndex = getTouchIndexAt(x, y);
    if (touchIndex < 0) {
      if (quitButtonRect.contains(x, y)) {
        commandQuit();
      } else if (hintButtonRect.contains(x, y)) {
        commandHint(true);
      } else if (retryButtonRect.contains(x, y)) {
        commandRetry();
      } else if (undoButtonRect.contains(x, y)) {
        commandUndo();
      } else if (doneButtonRect.contains(x, y)) {
        commandDone();
      }
      return;
    }
    commandPopPush(touchIndex);
  }

  function onTouchMove(x, y) {
    if (popIndex < 0) {
      return;
    }
    var touchIndex = getTouchIndexAt(x, y);
    if (
      touchIndex < 0 ||
      touchIndex === pushIndex ||
      (touchIndex === popIndex && pushIndex < 0)
    ) {
      return;
    }
    pushIndex = touchIndex;
    paint();
  }

  function onTouchEnd() {
    if (hinting) {
      commandHint(false);
      return;
    }
    if (popIndex < 0 || pushIndex < 0) {
      return;
    }
    commandPush(pushIndex);
  }

  function getTouchIndexAt(x, y) {
    if (y >= boardRect.top && y < boardRect.bottom()) {
      var stackIndex = Math.floor(
        (stackCount * (x - boardRect.left)) / boardRect.width
      );
      if (stackIndex >= 0 && stackIndex < stackCount) {
        return stackIndex;
      }
    }
    return -1;
  }

  function onKeyDown(event) {
    if (hinting) {
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    if (scene == sceneHome) {
      switch (event.key) {
      case 'ArrowLeft':
      case 'Left':
      case 'a':
        commandLevelCursor(-1);
        break;
      case 'ArrowRight':
      case 'Right':
      case 'd':
        commandLevelCursor(1);
        break;
      case 'Enter':
      case ' ':
      case 'Spacebar':
        commandLevelSelect();
        break;
      case '1':
        commandStart(3);
        break;
      case '2':
        commandStart(4);
        break;
      case '3':
        commandStart(5);
        break;
      default:
        return;
      }
    } else {
      switch (event.key) {
      case 'ArrowLeft':
      case 'Left':
      case 'a':
        commandStackCursor(-1);
        break;
      case 'ArrowRight':
      case 'Right':
      case 'd':
        commandStackCursor(1);
        break;
      case 'ArrowUp':
      case 'Up':
      case 'w':
        commandPopPush(cursorIndex);
        break;
      case 'ArrowDown':
      case 'Down':
      case 's':
      case '-':
      case 'Subtract':
        commandUndo();
        break;
      case 'Escape':
      case 'Esc':
      case '0':
        commandRetry();
        break;
      case '1':
        commandPopPush(0);
        break;
      case '2':
        commandPopPush(1);
        break;
      case '3':
        commandPopPush(2);
        break;
      case '4':
        commandPopPush(3);
        break;
      case '5':
        commandPopPush(4);
        break;
      case 'Enter':
      case ' ':
      case 'Spacebar':
        commandDone();
        break;
      case 'Q':
        commandQuit();
        break;
      default:
        return;
      }
    }
    preventEvent(event);
  }

  function commandQuit() {
    if (cursorIndex >= 0) {
      cursorIndex = stackCount - 3;
    }
    history.replaceState(null, null, '#');
    goHome();
  }

  function goHome() {
    document.title = appName;
    scene = sceneHome;
    paint();
  }

  function commandLevelCursor(d) {
    cursorIndex += d;
    if (cursorIndex < 0) {
      cursorIndex = levelButtonRects.length - 1;
    } else if (cursorIndex >= levelButtonRects.length) {
      cursorIndex = 0;
    }
    paint();
  }

  function commandLevelSelect() {
    if (cursorIndex < 0) {
      return;
    }
    commandStart(cursorIndex + 3);
  }

  function commandStart(newStackCount) {
    if (cursorIndex >= 0) {
      cursorIndex = 0;
    }
    updateStackCount(newStackCount);
    commandNext();
  }

  function commandDone() {
    if (scene === sceneResult) {
      commandNext();
    } else if (scene === sceneCompleted) {
      commandQuit();
    }
  }

  function commandNext() {
    var kindCount = stackCount - 1;
    var kindMap = new Array(kindCount);
    for (var i = 0; i < kindCount; i++) {
      kindMap[i] = i;
    }
    shuffleArray(kindMap);
    var problemCodes = Object.keys(problemTable[stackCount]);
    var records = recordTable[stackCount];
    if (Object.keys(records).length < problemCodes.length) {
      for (var p = problemCodes.length - 1; p >= 0; p--) {
        var problemCode = problemCodes[p];
        if (records[problemCode]) {
          problemCodes.splice(p, 1);
        }
      }
    } else {
      recordTable[stackCount] = {};
    }
    var stackCodes = problemCodes[randomInt(problemCodes.length)].split('_');
    shuffleArray(stackCodes);
    boardCode = stackCodes
      .map(function(sc) {
        return sc
          .split('')
          .map(function(c) {
            return kindMap[parseInt(c)];
          })
          .join('');
      })
      .join('_');
    board = boardCodeToBoard(boardCode);
    history.replaceState(null, null, '#' + boardCode);
    goPlay();
  }

  function goPlay() {
    if (notificationId > 0) {
      clearTimeout(notificationId);
      notificationId = 0;
    }
    popIndex = -1;
    pushIndex = -1;
    moves = [];
    var norm = normalize(boardCode);
    var problem = problemTable[board.length][norm.boardCode];
    if (problem) {
      routeLimit = problem[1];
      hint = applyMap(
        problem[0].split('').map(function(c) {
          return parseInt(c);
        }),
        invertMap(norm.kindMap)
      );
    } else {
      routeLimit = 0;
      hint = null;
    }
    hinting = false;
    document.title = appName + ' ' + boardCode;
    scene = scenePlay;
    paint();
  }

  function commandStackCursor(d) {
    cursorIndex += d;
    if (cursorIndex < 0) {
      cursorIndex = stackCount - 1;
    } else if (cursorIndex >= stackCount) {
      cursorIndex = 0;
    }
    if (popIndex >= 0) {
      pushIndex = cursorIndex;
    }
    paint();
  }

  function commandPopPush(stackIndex) {
    if (!(stackIndex >= 0 && stackIndex < stackCount)) {
      return;
    }
    if (popIndex < 0) {
      commandPop(stackIndex);
    } else {
      commandPush(stackIndex);
    }
  }

  function commandPop(stackIndex) {
    var srcStack = board[stackIndex];
    if (srcStack.length === 0) {
      return;
    }
    popIndex = stackIndex;
    pushIndex = -1;
    paint();
  }

  function commandPush(stackIndex) {
    if (stackIndex !== popIndex) {
      var dstStack = board[stackIndex];
      if (dstStack.length < stackCount) {
        dstStack.push(board[popIndex].pop());
        moves.push([popIndex, stackIndex]);
        if (isBoardArranged(board)) {
          if (moves.length <= routeLimit) {
            var records = recordTable[stackCount];
            var patternCode = normalize(boardCode).boardCode;
            var completed = false;
            if (!records[patternCode]) {
              records[patternCode] = 1;
              saveRecords(stackCount, records);
              completed =
                Object.keys(records).length ===
                Object.keys(problemTable[stackCount]).length;
            }
            if (completed) {
              showNotification('Level Completed', completeColor);
              scene = sceneCompleted;
            } else {
              showNotification('Cleared', successColor);
              scene = sceneResult;
            }
          }
        } else {
          if (moves.length === routeLimit) {
            showNotification('Not Cleared', failureColor);
          }
        }
      }
    }
    popIndex = -1;
    pushIndex = -1;
    paint();
  }

  function commandRetry() {
    for (var i = moves.length - 1; i >= 0; i--) {
      var move = moves[i];
      board[move[0]].push(board[move[1]].pop());
    }
    moves = [];
    popIndex = -1;
    pushIndex = -1;
    paint();
  }

  function commandUndo() {
    if (popIndex < 0 && moves.length > 0) {
      var move = moves[moves.length - 1];
      board[move[0]].push(board[move[1]].pop());
      moves.splice(moves.length - 1, 1);
    }
    popIndex = -1;
    pushIndex = -1;
    paint();
  }

  function commandHint(newHinting) {
    hinting = newHinting;
    paint();
  }

  function commandHelp() {
    openUrl('https://github.com/stackshub/stacks/blob/master/README.md');
  }

  function openUrl(url) {
    parent.location.href = url;
  }

  function showNotification(text, color) {
    if (notificationId > 0) {
      clearTimeout(notificationId);
    }
    notificationText = text;
    notificationColor = color;
    notificationId = setTimeout(function() {
      notificationId = 0;
      paint();
    }, 1000);
  }

  function loadRecords(stackCount) {
    return JSON.parse(localStorage.getItem('stacks_' + stackCount)) || {};
  }

  function saveRecords(stackCount, records) {
    localStorage.setItem('stacks_' + stackCount, JSON.stringify(records));
  }

  function paint() {
    context.clearRect(0, 0, stageWidth, stageHeight);

    if (scene === sceneHome) {
      paintLabel(appName, titleLabelRect);
      for (var l = 0; l < levelButtonRects.length; l++) {
        paintButton(formatLevelText(l), levelButtonRects[l], l === cursorIndex);
      }
      paintButton('README', helpButtonRect);
      return;
    }

    context.beginPath();
    var leftTopPieceRect = pieceRectTable[0][stackCount];
    var rightButtonPieceRect = pieceRectTable[stackCount - 1][0];
    context.moveTo(leftTopPieceRect.left, leftTopPieceRect.top);
    for (var p = 0; p < stackCount; p++) {
      var pieceRect = pieceRectTable[p][stackCount - 1];
      context.lineTo(pieceRect.left, pieceRect.top);
      context.lineTo(pieceRect.left, rightButtonPieceRect.bottom());
      context.lineTo(pieceRect.right(), rightButtonPieceRect.bottom());
      context.lineTo(pieceRect.right(), pieceRect.top);
    }
    context.lineTo(rightButtonPieceRect.right(), leftTopPieceRect.top);
    context.closePath();
    context.fillStyle = 'rgba(0, 0, 0, 0.2)';
    context.fill();
    context.stroke();

    if (hinting && hint) {
      paintHint();
      return;
    }

    for (var i = 0; i < stackCount; i++) {
      var stackButtonRect = stackButtonRects[i];
      paintButton(stackNames[i], stackButtonRect, i === cursorIndex);
      var stack = board[i];
      var pieceRects = pieceRectTable[i];
      var n = i === popIndex ? stack.length - 1 : stack.length;
      for (var j = 0; j < n; j++) {
        paintPiece(stack[j], pieceRects[j]);
      }
    }
    if (popIndex >= 0) {
      var popStack = board[popIndex];
      paintPiece(
        popStack[popStack.length - 1],
        pieceRectTable[pushIndex >= 0 ? pushIndex : popIndex][stackCount]
      );
    }

    paintLabel(
      'Limit ' +
        (routeLimit > 0 ? routeLimit : '?') +
        '\nMoves ' +
        moves.length,
      countLabelRect
    );
    paintButton('Quit', quitButtonRect);
    paintButton('Hint', hintButtonRect);
    paintButton('Retry', retryButtonRect);
    paintButton('Undo', undoButtonRect);
    if (scene === scenePlay) {
      paintLabel(formatLevelText(stackCount - 3), doneButtonRect);
    } else if (scene === sceneResult) {
      paintButton('Next', doneButtonRect, false, successColor);
    } else if (scene === sceneCompleted) {
      paintButton('Finish', doneButtonRect, false, completeColor);
    }
    if (notificationId > 0) {
      context.beginPath();
      drawOval(notificationRect);
      context.fillStyle = notificationColor;
      context.fill();
      paintLabel(notificationText, notificationRect);
    }
  }

  function paintHint() {
    for (var i = 0; i < stackCount; i++) {
      var stackButtonRect = stackButtonRects[i];
      paintButton('', stackButtonRect, false);
      var pieceRects = pieceRectTable[i];
      for (var j = 0; j < hint.length; j++) {
        paintPiece(hint[j], pieceRects[j]);
      }
    }
  }

  function formatLevelText(levelIndex) {
    return (
      'Level ' +
      (levelIndex + 1) +
      '\n' +
      Object.keys(recordTable[levelIndex + 3]).length +
      ' / ' +
      Object.keys(problemTable[levelIndex + 3]).length
    );
  }

  function paintPiece(pieceKind, pieceRect) {
    context.beginPath();
    switch (pieceKind) {
    case 1:
      drawOval(pieceRect);
      break;
    case 2:
      var h = pieceRect.height / 4;
      context.moveTo(pieceRect.left + h, pieceRect.top);
      context.lineTo(pieceRect.left, pieceRect.centerY());
      context.lineTo(pieceRect.left + h, pieceRect.bottom());
      context.lineTo(pieceRect.right() - h, pieceRect.bottom());
      context.lineTo(pieceRect.right(), pieceRect.centerY());
      context.lineTo(pieceRect.right() - h, pieceRect.top);
      context.closePath();
      break;
    case 3:
      var d = pieceRect.height / 4;
      context.moveTo(pieceRect.left, pieceRect.top);
      context.lineTo(pieceRect.left + d, pieceRect.centerY());
      context.lineTo(pieceRect.left, pieceRect.bottom());
      context.lineTo(pieceRect.right(), pieceRect.bottom());
      context.lineTo(pieceRect.right() - d, pieceRect.centerY());
      context.lineTo(pieceRect.right(), pieceRect.top);
      context.closePath();
      break;
    default:
      context.rect(
        pieceRect.left,
        pieceRect.top,
        pieceRect.width,
        pieceRect.height
      );
    }
    context.fillStyle = kindColors[pieceKind];
    context.fill();
    context.stroke();
  }

  function drawOval(rect) {
    var r = rect.height / 2;
    context.arc(
      rect.left + r,
      rect.centerY(),
      r,
      Math.PI * 1.5,
      Math.PI * 0.5,
      true
    );
    context.arc(
      rect.right() - r,
      rect.centerY(),
      r,
      Math.PI * 0.5,
      Math.PI * 1.5,
      true
    );
    context.closePath();
  }

  function paintButton(text, rect, cursor, color) {
    context.beginPath();
    context.rect(rect.left, rect.top, rect.width, rect.height);
    context.fillStyle = color || 'rgba(255, 255, 255, 0.2)';
    context.fill();
    context.stroke();
    paintLabel(text, rect);
    if (cursor) {
      context.strokeRect(
        rect.left + margin,
        rect.top + margin,
        rect.width - margin * 2,
        rect.height - margin * 2
      );
    }
  }

  function paintLabel(text, rect) {
    var lines = text.split('\n');
    var h = rect.height / lines.length;
    var y = rect.top + h / 2;
    context.fillStyle = textColor;
    for (var i = 0; i < lines.length; i++) {
      context.fillText(lines[i], rect.centerX(), y + h * i);
    }
  }
};

function boardCodeToBoard(boardCode) {
  var stackCodes = boardCode.split('_');
  var stackCount = stackCodes.length;
  if (stackCount < 3 || stackCount > 5) {
    return null;
  }
  if (boardCode.length !== stackCount * stackCount - 1) {
    return null;
  }
  var board = new Array(stackCount);
  var kindCount = stackCount - 1;
  for (var i = 0; i < stackCount; i++) {
    var stackCode = stackCodes[i];
    var pieceCount = stackCode.length;
    if (pieceCount > stackCount) {
      return null;
    }
    var stack = (board[i] = new Array(pieceCount));
    for (var j = 0; j < pieceCount; j++) {
      var pieceKind = parseInt(stackCode.charAt(j));
      if (!(pieceKind >= 0 && pieceKind < kindCount)) {
        return null;
      }
      stack[j] = pieceKind;
    }
  }
  return board;
}

function normalize(boardCode) {
  var stackCodes = boardCode.split('_');
  var permutations = permutationTable[stackCodes.length - 1];
  var minNormalization;
  for (var i = 0; i < permutations.length; i++) {
    var kindMap = permutations[i];
    var scs = stackCodes.map(function(sc) {
      return sc
        .split('')
        .map(function(c) {
          return kindMap[parseInt(c)];
        })
        .join('');
    });
    scs.sort();
    var bc = scs.join('_');
    if (!minNormalization || bc < minNormalization.boardCode) {
      minNormalization = {
        boardCode: bc,
        kindMap: kindMap.slice(0)
      };
    }
  }
  return minNormalization;
}

function invertMap(map) {
  var inv = new Array(map.length);
  for (var i = 0; i < map.length; i++) {
    inv[map[i]] = i;
  }
  return inv;
}

function applyMap(arr, map) {
  var app = new Array(map.length);
  for (var i = 0; i < map.length; i++) {
    app[i] = map[arr[i]];
  }
  return app;
}

function isBoardArranged(board) {
  var stackCount = board.length;
  var kindCount = stackCount - 1;
  var firstStack = board[0];
  if (firstStack.length != kindCount) {
    return false;
  }
  for (var i = 1; i < stackCount; i++) {
    var stack = board[i];
    if (stack.length != kindCount) {
      return false;
    }
    for (var j = 0; j < kindCount; j++) {
      if (stack[j] != firstStack[j]) {
        return false;
      }
    }
  }
  return true;
}

function addTouchStartListener(target, listener) {
  target.addEventListener(
    'mousedown',
    function(event) {
      preventEvent(event);
      if (!target.touchFirst) {
        var rect = event.target.getBoundingClientRect();
        listener(event.clientX - rect.left, event.clientY - rect.top);
      }
    },
    false
  );
  target.addEventListener(
    'touchstart',
    function(event) {
      preventEvent(event);
      target.touchFirst = true;
      var rect = event.target.getBoundingClientRect();
      for (var i = 0; i < event.changedTouches.length; i++) {
        var touch = event.changedTouches[i];
        listener(touch.clientX - rect.left, touch.clientY - rect.top);
      }
    },
    false
  );
}

function addTouchMoveListener(target, listener) {
  target.addEventListener(
    'mousemove',
    function(event) {
      preventEvent(event);
      if (!target.touchFirst) {
        var rect = event.target.getBoundingClientRect();
        listener(event.clientX - rect.left, event.clientY - rect.top);
      }
    },
    false
  );
  target.addEventListener(
    'touchmove',
    function(event) {
      preventEvent(event);
      var rect = event.target.getBoundingClientRect();
      for (var i = 0; i < event.changedTouches.length; i++) {
        var touch = event.changedTouches[i];
        listener(touch.clientX - rect.left, touch.clientY - rect.top);
      }
    },
    false
  );
}

function addTouchEndListener(target, listener) {
  target.addEventListener(
    'mouseup',
    function(event) {
      preventEvent(event);
      if (!target.touchFirst) {
        var rect = event.target.getBoundingClientRect();
        listener(event.clientX - rect.left, event.clientY - rect.top);
      }
    },
    false
  );
  target.addEventListener(
    'touchend',
    function(event) {
      preventEvent(event);
      var rect = event.target.getBoundingClientRect();
      for (var i = 0; i < event.changedTouches.length; i++) {
        var touch = event.changedTouches[i];
        listener(touch.clientX - rect.left, touch.clientY - rect.top);
      }
    },
    false
  );
}

function preventEvent(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function shuffleArray(arr, len) {
  var i = len || arr.length;
  while (i > 0) {
    var j = randomInt(i);
    var t = arr[--i];
    arr[i] = arr[j];
    arr[j] = t;
  }
}

function randomInt(n) {
  return Math.floor(Math.random() * n);
}

function Rect(left, top, width, height) {
  this.left = left;
  this.top = top;
  this.width = width;
  this.height = height;
}

Rect.prototype.right = function() {
  return this.left + this.width;
};

Rect.prototype.bottom = function() {
  return this.top + this.height;
};

Rect.prototype.centerX = function() {
  return this.left + this.width / 2;
};

Rect.prototype.centerY = function() {
  return this.top + this.height / 2;
};

Rect.prototype.contains = function(x, y) {
  return (
    x >= this.left && x < this.right() && y >= this.top && y < this.bottom()
  );
};

var permutationTable = {
  2: [[0, 1], [1, 0]],
  3: [[0, 1, 2], [1, 0, 2], [2, 0, 1], [0, 2, 1], [1, 2, 0], [2, 1, 0]],
  4: [
    [0, 1, 2, 3],
    [1, 0, 2, 3],
    [2, 0, 1, 3],
    [3, 0, 1, 2],
    [0, 2, 1, 3],
    [1, 2, 0, 3],
    [2, 1, 0, 3],
    [3, 1, 0, 2],
    [0, 3, 1, 2],
    [1, 3, 0, 2],
    [2, 3, 0, 1],
    [3, 2, 0, 1],
    [0, 1, 3, 2],
    [1, 0, 3, 2],
    [2, 0, 3, 1],
    [3, 0, 2, 1],
    [0, 2, 3, 1],
    [1, 2, 3, 0],
    [2, 1, 3, 0],
    [3, 1, 2, 0],
    [0, 3, 2, 1],
    [1, 3, 2, 0],
    [2, 3, 1, 0],
    [3, 2, 1, 0]
  ]
};

var problemTable = {
  3: {
    '00_01_11': ['01', 5],
    '01_01_10': ['01', 4]
  },
  4: {
    '000_011_112_222': ['021', 16],
    '000_011_121_222': ['012', 14],
    '000_011_122_122': ['120', 13],
    '000_011_122_212': ['012', 16],
    '000_011_122_221': ['012', 15],
    '000_011_211_222': ['012', 16],
    '000_011_212_212': ['210', 13],
    '000_011_212_221': ['012', 15],
    '000_011_221_221': ['012', 13],
    '000_012_111_222': ['012', 14],
    '000_012_112_122': ['021', 15],
    '000_012_112_212': ['021', 14],
    '000_012_112_221': ['012', 14],
    '000_012_121_122': ['012', 13],
    '000_012_121_212': ['012', 13],
    '000_012_121_221': ['012', 12],
    '000_012_122_211': ['012', 15],
    '000_012_211_212': ['210', 14],
    '000_012_211_221': ['012', 13],
    '000_101_112_222': ['102', 15],
    '000_101_121_222': ['120', 15],
    '000_101_122_122': ['120', 11],
    '000_101_122_212': ['120', 15],
    '000_101_122_221': ['102', 15],
    '000_101_212_212': ['210', 12],
    '000_101_212_221': ['210', 14],
    '000_101_221_221': ['210', 16],
    '000_102_112_122': ['120', 12],
    '000_102_112_212': ['102', 14],
    '000_102_112_221': ['102', 14],
    '000_102_121_122': ['120', 10],
    '000_102_121_212': ['102', 14],
    '000_102_121_221': ['102', 14],
    '000_102_122_211': ['102', 14],
    '000_102_211_212': ['210', 13],
    '000_102_211_221': ['210', 15],
    '000_110_112_222': ['120', 17],
    '000_110_122_122': ['120', 11],
    '000_110_122_212': ['120', 15],
    '000_110_122_221': ['120', 15],
    '000_110_212_212': ['210', 13],
    '000_110_212_221': ['210', 15],
    '000_110_221_221': ['201', 16],
    '000_112_120_122': ['120', 10],
    '000_112_120_212': ['120', 14],
    '000_112_120_221': ['120', 14],
    '000_112_122_210': ['120', 15],
    '000_112_210_212': ['210', 12],
    '000_120_121_122': ['120', 8],
    '000_120_121_212': ['120', 12],
    '000_120_122_211': ['120', 12],
    '000_120_211_212': ['210', 13],
    '001_001_122_122': ['120', 13],
    '001_001_122_212': ['021', 16],
    '001_001_122_221': ['012', 16],
    '001_001_212_212': ['210', 13],
    '001_001_212_221': ['210', 14],
    '001_001_221_221': ['012', 16],
    '001_002_112_122': ['120', 14],
    '001_002_112_212': ['021', 15],
    '001_002_112_221': ['012', 16],
    '001_002_121_122': ['120', 12],
    '001_002_121_212': ['012', 16],
    '001_002_122_211': ['210', 16],
    '001_010_122_122': ['120', 13],
    '001_010_122_212': ['012', 15],
    '001_010_122_221': ['012', 14],
    '001_010_212_212': ['210', 13],
    '001_010_212_221': ['012', 14],
    '001_011_022_122': ['012', 13],
    '001_011_022_212': ['021', 12],
    '001_011_022_221': ['012', 12],
    '001_011_122_202': ['012', 15],
    '001_011_122_220': ['012', 15],
    '001_011_202_212': ['012', 15],
    '001_011_202_221': ['012', 14],
    '001_011_212_220': ['210', 14],
    '001_012_012_122': ['012', 9],
    '001_012_012_212': ['012', 9],
    '001_012_012_221': ['012', 8],
    '001_012_021_122': ['012', 11],
    '001_012_021_212': ['021', 10],
    '001_012_021_221': ['012', 10],
    '001_012_022_112': ['012', 12],
    '001_012_022_121': ['012', 11],
    '001_012_022_211': ['012', 12],
    '001_012_102_122': ['102', 14],
    '001_012_102_212': ['012', 14],
    '001_012_102_221': ['012', 13],
    '001_012_112_202': ['012', 14],
    '001_012_112_220': ['012', 14],
    '001_012_120_122': ['120', 12],
    '001_012_120_212': ['012', 14],
    '001_012_120_221': ['012', 13],
    '001_012_121_202': ['012', 13],
    '001_012_121_220': ['012', 13],
    '001_012_122_201': ['012', 14],
    '001_012_122_210': ['012', 14],
    '001_012_201_212': ['012', 14],
    '001_012_201_221': ['012', 13],
    '001_012_202_211': ['012', 14],
    '001_012_210_212': ['210', 12],
    '001_012_210_221': ['210', 13],
    '001_012_211_220': ['012', 14],
    '001_020_112_212': ['021', 13],
    '001_020_112_221': ['021', 14],
    '001_020_121_122': ['120', 13],
    '001_020_121_212': ['021', 14],
    '001_020_121_221': ['012', 15],
    '001_020_122_211': ['021', 15],
    '001_020_211_212': ['210', 12],
    '001_021_021_122': ['021', 9],
    '001_021_021_212': ['021', 8],
    '001_021_021_221': ['021', 11],
    '001_021_022_112': ['021', 9],
    '001_021_022_121': ['021', 10],
    '001_021_022_211': ['021', 10],
    '001_021_102_122': ['102', 14],
    '001_021_102_212': ['021', 13],
    '001_021_102_221': ['012', 15],
    '001_021_112_202': ['021', 13],
    '001_021_112_220': ['021', 13],
    '001_021_120_122': ['120', 12],
    '001_021_120_212': ['021', 13],
    '001_021_120_221': ['012', 15],
    '001_021_121_202': ['021', 14],
    '001_021_121_220': ['021', 14],
    '001_021_122_201': ['021', 14],
    '001_021_122_210': ['021', 14],
    '001_021_201_212': ['021', 13],
    '001_021_201_221': ['021', 15],
    '001_021_202_211': ['021', 14],
    '001_021_210_212': ['210', 12],
    '001_021_211_220': ['021', 14],
    '001_022_101_122': ['102', 15],
    '001_022_101_212': ['021', 14],
    '001_022_101_221': ['021', 15],
    '001_022_102_121': ['120', 14],
    '001_022_102_211': ['021', 15],
    '001_022_110_122': ['021', 15],
    '001_022_110_212': ['021', 14],
    '001_022_110_221': ['021', 15],
    '001_022_112_201': ['021', 14],
    '001_022_112_210': ['021', 14],
    '001_022_120_121': ['120', 12],
    '001_022_120_211': ['021', 15],
    '001_022_121_201': ['021', 15],
    '001_022_121_210': ['021', 15],
    '001_022_201_211': ['201', 14],
    '001_022_210_211': ['210', 11],
    '001_100_122_122': ['120', 11],
    '001_100_122_212': ['102', 15],
    '001_100_122_221': ['102', 15],
    '001_100_212_212': ['210', 12],
    '001_101_122_202': ['120', 14],
    '001_101_122_220': ['102', 15],
    '001_101_202_212': ['210', 14],
    '001_102_102_122': ['102', 9],
    '001_102_102_212': ['102', 11],
    '001_102_102_221': ['102', 11],
    '001_102_120_122': ['120', 9],
    '001_102_120_212': ['120', 13],
    '001_102_120_221': ['102', 13],
    '001_102_121_202': ['120', 13],
    '001_102_121_220': ['102', 14],
    '001_102_122_201': ['120', 14],
    '001_102_122_210': ['120', 14],
    '001_102_201_212': ['210', 13],
    '001_102_202_211': ['210', 14],
    '001_102_210_212': ['210', 11],
    '001_110_202_212': ['201', 15],
    '001_112_201_202': ['201', 12],
    '001_120_120_122': ['120', 7],
    '001_120_120_212': ['120', 11],
    '001_120_121_202': ['120', 11],
    '001_120_122_201': ['120', 12],
    '001_120_122_210': ['120', 12],
    '001_120_201_212': ['210', 13],
    '001_120_202_211': ['210', 14],
    '001_120_210_212': ['210', 11],
    '001_121_122_200': ['120', 13],
    '001_121_200_212': ['210', 14],
    '001_121_201_202': ['201', 12],
    '001_121_202_210': ['210', 13],
    '001_122_200_211': ['210', 14],
    '001_122_201_201': ['201', 12],
    '001_122_201_210': ['210', 12],
    '001_122_210_210': ['210', 10],
    '001_200_211_212': ['210', 10],
    '001_201_201_212': ['201', 10],
    '001_201_202_211': ['201', 10],
    '001_201_210_212': ['210', 9],
    '001_202_210_211': ['210', 9],
    '001_210_210_212': ['210', 7],
    '010_010_122_122': ['012', 13],
    '010_010_122_212': ['012', 13],
    '010_010_212_212': ['012', 14],
    '010_011_022_122': ['012', 11],
    '010_011_022_212': ['012', 11],
    '010_011_122_202': ['012', 13],
    '010_011_202_212': ['012', 13],
    '010_012_012_122': ['012', 7],
    '010_012_012_212': ['012', 7],
    '010_012_021_122': ['012', 9],
    '010_012_021_212': ['012', 9],
    '010_012_022_121': ['012', 9],
    '010_012_022_211': ['012', 10],
    '010_012_102_122': ['012', 12],
    '010_012_102_212': ['012', 12],
    '010_012_120_122': ['012', 12],
    '010_012_120_212': ['012', 12],
    '010_012_121_202': ['012', 11],
    '010_012_122_201': ['012', 12],
    '010_012_122_210': ['012', 12],
    '010_012_201_212': ['012', 12],
    '010_012_202_211': ['012', 12],
    '010_012_210_212': ['012', 13],
    '010_020_121_212': ['021', 15],
    '010_020_122_211': ['021', 15],
    '010_021_021_122': ['021', 9],
    '010_021_021_212': ['021', 8],
    '010_021_022_121': ['021', 10],
    '010_021_022_211': ['021', 10],
    '010_021_102_122': ['102', 14],
    '010_021_102_212': ['021', 13],
    '010_021_120_122': ['120', 12],
    '010_021_120_212': ['021', 14],
    '010_021_121_202': ['012', 13],
    '010_021_122_201': ['021', 14],
    '010_021_122_210': ['021', 14],
    '010_021_201_212': ['021', 13],
    '010_021_202_211': ['021', 14],
    '010_022_101_122': ['102', 15],
    '010_022_101_212': ['021', 14],
    '010_022_102_211': ['021', 15],
    '010_022_120_211': ['012', 15],
    '010_022_121_201': ['012', 14],
    '010_022_121_210': ['021', 15],
    '010_022_201_211': ['201', 13],
    '010_022_210_211': ['210', 12],
    '010_100_122_122': ['120', 11],
    '010_100_122_212': ['102', 15],
    '010_102_102_122': ['102', 9],
    '010_102_102_212': ['102', 11],
    '010_102_120_122': ['120', 9],
    '010_102_120_212': ['102', 13],
    '010_102_122_201': ['120', 14],
    '010_102_122_210': ['102', 14],
    '010_120_120_122': ['120', 7],
    '010_120_122_201': ['120', 12],
    '010_120_122_210': ['120', 12],
    '010_122_200_211': ['201', 14],
    '010_122_201_201': ['201', 10],
    '010_122_201_210': ['201', 12],
    '010_122_210_210': ['210', 11],
    '011_011_022_022': ['012', 9],
    '011_012_012_022': ['012', 5],
    '011_012_021_022': ['012', 7],
    '011_012_022_102': ['012', 10],
    '011_012_022_120': ['012', 10],
    '011_012_022_201': ['012', 10],
    '011_012_022_210': ['012', 10],
    '011_012_122_200': ['012', 12],
    '011_021_122_200': ['021', 14],
    '011_022_100_122': ['120', 15],
    '011_022_102_102': ['102', 11],
    '011_022_102_120': ['120', 13],
    '011_022_102_201': ['021', 15],
    '011_022_102_210': ['021', 15],
    '011_022_120_120': ['120', 11],
    '011_022_120_210': ['021', 15],
    '012_012_012_021': ['012', 4],
    '012_012_012_102': ['012', 6],
    '012_012_012_120': ['012', 6],
    '012_012_012_201': ['012', 6],
    '012_012_012_210': ['012', 6],
    '012_012_021_021': ['012', 6],
    '012_012_021_102': ['012', 8],
    '012_012_021_120': ['012', 8],
    '012_012_021_201': ['012', 8],
    '012_012_021_210': ['012', 8],
    '012_012_102_102': ['102', 11],
    '012_012_102_120': ['012', 11],
    '012_012_102_201': ['012', 11],
    '012_012_102_210': ['012', 11],
    '012_012_120_120': ['120', 11],
    '012_012_120_201': ['012', 11],
    '012_012_120_210': ['012', 11],
    '012_012_201_210': ['012', 11],
    '012_012_210_210': ['210', 12],
    '012_021_102_120': ['102', 13],
    '012_021_102_201': ['021', 13],
    '012_021_102_210': ['021', 13],
    '012_021_120_210': ['021', 13]
  },
  5: {
    '0000_0111_1122_2223_3333': ['0321', 30],
    '0000_0121_2223_2311_3313': ['2310', 26],
    '0000_0123_2111_2332_3321': ['0123', 26],
    '0000_1021_1323_3112_3322': ['1023', 26],
    '0000_1023_1233_2311_2312': ['2310', 23],
    '0000_1110_2231_3223_3231': ['3201', 26],
    '0000_1121_1232_2330_3321': ['1230', 27],
    '0000_1123_1302_1322_3132': ['1320', 22],
    '0000_1210_2121_2133_2333': ['2130', 22],
    '0001_0012_2312_2312_3331': ['2310', 23],
    '0001_0023_1121_2313_3232': ['0132', 28],
    '0001_0102_2131_3221_3332': ['0123', 27],
    '0001_0112_1220_2333_3231': ['0132', 27],
    '0001_0120_1233_2131_3223': ['0132', 27],
    '0001_0121_1322_3312_3320': ['0123', 26],
    '0001_0122_0333_3112_3212': ['0123', 25],
    '0001_0122_2121_3310_3323': ['0123', 26],
    '0001_0123_1120_1323_3322': ['0123', 25],
    '0001_0123_2032_2132_3113': ['0123', 25],
    '0001_0202_1131_2233_2313': ['2310', 27],
    '0001_0210_1133_1332_2223': ['1302', 28],
    '0001_0211_1320_2332_3231': ['0213', 26],
    '0001_0212_1032_1233_3132': ['1230', 25],
    '0001_0212_2211_3013_3332': ['3012', 26],
    '0001_0213_1203_1313_2223': ['1302', 27],
    '0001_0213_2132_3102_3213': ['0213', 26],
    '0001_0221_1032_2133_3321': ['0123', 27],
    '0001_0221_2213_3130_3231': ['0132', 28],
    '0001_0222_1330_3211_3213': ['3210', 23],
    '0001_0223_1133_1203_2231': ['0132', 28],
    '0001_0223_2231_3131_3210': ['3210', 26],
    '0001_0231_1112_2032_3233': ['0231', 25],
    '0001_0231_2031_2231_3132': ['0231', 26],
    '0001_0232_1123_2230_3131': ['0231', 26],
    '0001_0232_2113_2133_3021': ['2130', 25],
    '0001_0233_1211_2023_3132': ['0231', 25],
    '0001_1001_2113_2322_2333': ['2310', 23],
    '0001_1012_1232_2313_3302': ['1230', 26],
    '0001_1020_2123_2331_3132': ['2130', 27],
    '0001_1021_3022_3113_3223': ['3120', 25],
    '0001_1022_2133_2331_3120': ['2130', 26],
    '0001_1023_1312_3022_3231': ['1023', 26],
    '0001_1101_2132_2233_2303': ['2130', 23],
    '0001_1112_2012_2332_3303': ['2310', 27],
    '0001_1120_2233_3023_3121': ['3120', 27],
    '0001_1122_1301_2320_3323': ['1302', 26],
    '0001_1123_1210_2203_3233': ['1302', 28],
    '0001_1123_2201_2333_3012': ['2301', 28],
    '0001_1201_1332_2303_3221': ['1203', 26],
    '0001_1202_2021_2313_3331': ['2310', 26],
    '0001_1203_1332_2310_2321': ['2310', 23],
    '0001_1210_2132_2333_3012': ['2130', 26],
    '0001_1212_1320_2330_3231': ['1320', 27],
    '0001_1213_1320_1323_3220': ['1320', 21],
    '0001_1220_1223_3033_3211': ['1230', 26],
    '0001_1221_2023_2133_3310': ['2130', 27],
    '0001_1222_3022_3103_3131': ['3102', 22],
    '0001_1223_3102_3123_3210': ['3102', 22],
    '0001_1231_2013_2321_3302': ['2013', 25],
    '0001_1232_2102_3012_3313': ['3012', 27],
    '0001_1233_2131_2301_3022': ['2130', 26],
    '0001_2011_2233_2313_3012': ['2310', 23],
    '0001_2013_2320_3211_3213': ['3210', 22],
    '0001_2030_2131_2312_3321': ['2130', 24],
    '0001_2100_2123_3212_3313': ['2103', 24],
    '0001_2110_2131_2330_2332': ['2130', 21],
    '0001_2121_2331_3123_3200': ['3120', 26],
    '0010_0012_1332_2123_3231': ['0132', 29],
    '0010_0023_1131_2313_2322': ['2310', 23],
    '0010_0110_2132_2323_3312': ['0123', 27],
    '0010_0112_2033_2133_3212': ['2130', 26],
    '0010_0121_0332_1331_2322': ['0123', 23],
    '0010_0122_0232_3113_3123': ['0231', 23],
    '0010_0122_2023_3121_3133': ['3120', 24],
    '0010_0123_1123_1232_3320': ['0123', 25],
    '0010_0123_2122_3101_3323': ['0123', 26],
    '0010_0202_2133_3131_3212': ['3210', 26],
    '0010_0211_0233_1222_1333': ['0213', 23],
    '0010_0212_0213_3131_3232': ['0213', 19],
    '0010_0212_2013_2133_2331': ['2013', 22],
    '0010_0213_1133_2232_3120': ['0231', 27],
    '0010_0213_2211_2313_3032': ['0213', 25],
    '0010_0221_1202_3131_3233': ['3120', 27],
    '0010_0222_1031_2132_3133': ['0213', 27],
    '0010_0223_1031_1231_2323': ['1032', 25],
    '0010_0223_1331_2033_2112': ['0213', 27],
    '0010_0231_0323_1212_3123': ['0321', 23],
    '0010_0231_1332_2322_3011': ['0231', 25],
    '0010_0232_1132_1323_3102': ['0231', 25],
    '0010_0232_2311_3120_3312': ['3120', 26],
    '0010_0233_1232_1301_2312': ['0213', 26],
    '0010_1002_2313_2322_3311': ['2310', 24],
    '0010_1012_2332_3122_3130': ['3120', 24],
    '0010_1021_2231_3022_3133': ['3012', 26],
    '0010_1022_2133_3021_3321': ['3021', 26],
    '0010_1023_1323_2121_2303': ['1320', 25],
    '0010_1102_1323_2321_3230': ['1320', 27],
    '0010_1120_2233_3023_3112': ['3021', 25],
    '0010_1122_2033_2121_3033': ['2130', 27],
    '0010_1123_1332_3120_3220': ['3120', 26],
    '0010_1200_2321_3211_3233': ['3210', 24],
    '0010_1202_1321_3013_3223': ['1320', 25],
    '0010_1203_1323_2112_3320': ['1203', 26],
    '0010_1210_2230_3232_3311': ['3210', 28],
    '0010_1212_2030_2133_3312': ['2031', 26],
    '0010_1213_2031_2213_3320': ['2031', 24],
    '0010_1220_2231_3032_3311': ['3012', 27],
    '0010_1222_1323_2310_3013': ['1320', 26],
    '0010_1223_2133_2231_3001': ['2130', 25],
    '0010_1231_1233_1233_2002': ['1230', 17],
    '0010_1232_2030_3131_3221': ['3120', 27],
    '0010_1233_2123_2210_3013': ['3012', 27],
    '0010_2011_3033_3221_3221': ['3210', 23],
    '0010_2021_2132_3103_3312': ['2130', 26],
    '0010_2031_2311_3120_3322': ['3120', 25],
    '0010_2102_2311_2313_3230': ['2310', 21],
    '0010_2113_2320_3130_3212': ['3210', 27],
    '0011_0011_2233_3213_3220': ['3210', 24],
    '0011_0021_0123_3232_3321': ['0123', 21],
    '0011_0022_0132_1332_3123': ['0132', 23],
    '0011_0023_0322_1233_1321': ['0321', 24],
    '0011_0023_2012_3132_3312': ['3120', 27],
    '0011_0102_1123_2330_3232': ['0132', 27],
    '0011_0112_0230_3213_3322': ['0231', 24],
    '0011_0120_0332_2123_3312': ['0123', 24],
    '0011_0121_0323_1032_3223': ['0321', 23],
    '0011_0122_0310_1323_2323': ['0123', 23],
    '0011_0122_2011_3233_3302': ['0123', 26],
    '0011_0123_0233_1202_3213': ['0123', 24],
    '0011_0123_1232_3032_3102': ['0123', 25],
    '0011_0200_1132_2322_3133': ['0231', 26],
    '0011_0201_2231_2313_3023': ['2310', 25],
    '0011_0202_1331_2230_3132': ['0213', 28],
    '0011_0203_1133_2322_3021': ['0231', 27],
    '0011_0203_2320_3211_3231': ['3210', 24],
    '0011_0211_0230_2233_3312': ['0213', 21],
    '0011_0212_0320_1233_2331': ['0213', 24],
    '0011_0212_2103_2103_2333': ['2103', 20],
    '0011_0213_0332_0332_1122': ['0321', 21],
    '0011_0213_2023_3011_3322': ['0213', 25],
    '0011_0220_1230_1313_3232': ['1230', 26],
    '0011_0221_0331_2320_2331': ['0213', 26],
    '0011_0221_2312_3023_3301': ['3021', 26],
    '0011_0222_1320_2313_3103': ['1320', 28],
    '0011_0223_1013_3132_3220': ['0231', 26],
    '0011_0223_1303_1321_2023': ['1320', 22],
    '0011_0230_0232_1323_3112': ['0231', 21],
    '0011_0230_2023_2112_3133': ['0231', 26],
    '0011_0231_1203_2201_3233': ['0231', 26],
    '0011_0231_2303_3122_3201': ['0231', 26],
    '0011_0232_1203_1331_2302': ['1203', 24],
    '0011_0232_2113_2320_3103': ['0231', 25],
    '0011_0233_1132_1203_2023': ['1203', 26],
    '0011_0233_2021_2310_3321': ['2310', 25],
    '0011_1002_2033_3212_3321': ['3210', 26],
    '0011_1020_1233_2230_3312': ['1032', 26],
    '0011_1022_1132_2330_2330': ['1023', 26],
    '0011_1023_1203_1320_2332': ['1023', 22],
    '0011_1023_2310_3202_3231': ['3210', 25],
    '0011_1122_2003_2033_3231': ['2031', 25],
    '0011_1200_1323_3013_3222': ['1320', 26],
    '0011_1202_1323_2133_3002': ['1203', 26],
    '0011_1203_2002_3131_3223': ['1203', 28],
    '0011_1210_3212_3302_3302': ['3210', 24],
    '0011_1220_1230_3231_3320': ['1230', 25],
    '0011_1222_1230_3012_3033': ['1230', 23],
    '0011_1223_3000_3112_3223': ['3210', 26],
    '0011_1231_2021_2303_2303': ['2301', 21],
    '0011_1233_2002_2102_3133': ['2103', 28],
    '0011_2002_2113_3032_3213': ['3210', 25],
    '0011_2011_2032_3132_3230': ['2031', 24],
    '0011_2013_2301_2321_3032': ['2310', 22],
    '0011_2023_2113_3103_3202': ['3201', 26],
    '0011_2032_2130_3112_3320': ['2130', 25],
    '0011_2103_2302_3112_3302': ['2301', 26],
    '0012_0012_0312_1323_2331': ['0312', 25],
    '0012_0013_0121_1323_3232': ['0123', 23],
    '0012_0021_1102_1233_3233': ['1230', 26],
    '0012_0023_1130_1322_2331': ['1320', 25],
    '0012_0032_0131_1132_3223': ['0132', 25],
    '0012_0101_0223_2133_3132': ['0231', 24],
    '0012_0102_0332_2331_3112': ['0321', 25],
    '0012_0103_0213_3213_3221': ['0213', 24],
    '0012_0103_1332_3021_3122': ['3021', 25],
    '0012_0110_2132_3231_3302': ['0123', 27],
    '0012_0112_0132_0333_1223': ['0132', 19],
    '0012_0112_1302_3123_3302': ['3120', 27],
    '0012_0113_0222_3131_3230': ['0231', 24],
    '0012_0113_1223_2313_3002': ['2310', 28],
    '0012_0120_0133_2313_3122': ['0123', 23],
    '0012_0120_3023_3121_3312': ['3021', 23],
    '0012_0121_1230_1332_3302': ['1230', 24],
    '0012_0122_0233_1213_3031': ['0231', 23],
    '0012_0122_1330_2203_3113': ['0123', 28],
    '0012_0123_0233_0331_2121': ['0123', 20],
    '0012_0123_1102_1333_2203': ['0123', 26],
    '0012_0123_2013_2332_3101': ['0123', 26],
    '0012_0130_1132_3120_3223': ['3120', 26],
    '0012_0131_0133_2122_2330': ['0132', 21],
    '0012_0131_1033_2322_3120': ['0132', 26],
    '0012_0131_2312_3013_3202': ['3210', 26],
    '0012_0132_0321_3212_3310': ['0321', 22],
    '0012_0132_1223_3030_3112': ['0132', 26],
    '0012_0132_2321_3113_3200': ['0132', 26],
    '0012_0133_0322_1321_2130': ['0123', 24],
    '0012_0133_1223_2003_3112': ['0132', 27],
    '0012_0200_1231_3231_3312': ['0213', 25],
    '0012_0201_2131_3013_3223': ['3210', 26],
    '0012_0203_0321_1313_2132': ['0321', 22],
    '0012_0203_2113_3022_3113': ['3021', 27],
    '0012_0210_2132_3130_3213': ['0231', 26],
    '0012_0211_1233_2033_3021': ['0213', 26],
    '0012_0212_0331_0331_2213': ['0312', 20],
    '0012_0212_3102_3130_3132': ['3102', 21],
    '0012_0213_1013_2301_3223': ['0213', 26],
    '0012_0213_1320_2303_3211': ['0213', 25],
    '0012_0220_1232_1303_1313': ['1302', 22],
    '0012_0221_1102_2333_3031': ['0231', 28],
    '0012_0222_1132_3003_3113': ['0231', 26],
    '0012_0223_1033_1210_2331': ['1032', 26],
    '0012_0230_0321_1233_1312': ['0321', 23],
    '0012_0230_2131_2131_3023': ['2130', 23],
    '0012_0231_1023_1023_3123': ['1023', 22],
    '0012_0231_1323_2302_3101': ['0231', 26],
    '0012_0232_0333_1011_1322': ['0213', 25],
    '0012_0232_2011_3023_3131': ['0231', 25],
    '0012_0233_1031_1302_2231': ['1032', 25],
    '0012_0233_1331_2201_3210': ['3210', 26],
    '0012_0301_1212_2303_3213': ['0312', 26],
    '0012_0302_1022_1323_3113': ['1320', 25],
    '0012_0303_0312_2123_2131': ['0312', 22],
    '0012_0303_2121_2310_3321': ['2310', 25],
    '0012_0310_2103_2123_3312': ['2103', 24],
    '0012_0311_1233_1330_2022': ['1230', 26],
    '0012_0312_0323_1310_2213': ['0312', 20],
    '0012_0312_1233_2120_3103': ['0312', 26],
    '0012_0313_0322_1201_3321': ['0312', 22],
    '0012_0313_1230_2031_2312': ['2310', 25],
    '0012_0320_1032_1123_3123': ['1032', 24],
    '0012_0321_0323_1012_3132': ['0321', 19],
    '0012_0321_1233_1330_2102': ['0321', 25],
    '0012_0322_0333_1130_1221': ['0321', 22],
    '0012_0322_2111_3013_3032': ['3012', 25],
    '0012_0323_1210_2231_3013': ['0312', 26],
    '0012_0330_1032_1232_3121': ['1032', 25],
    '0012_0331_1012_2302_3321': ['0213', 28],
    '0012_0331_1320_2102_3312': ['1320', 27],
    '0012_0332_1032_1212_1330': ['1032', 23],
    '0012_0332_2031_3012_3121': ['3120', 25],
    '0012_0333_1231_2110_2320': ['2103', 27],
    '0012_1002_1031_1332_2323': ['1032', 23],
    '0012_1003_1233_2120_3312': ['1230', 26],
    '0012_1011_1033_2322_3302': ['1023', 25],
    '0012_1012_3022_3103_3123': ['3120', 21],
    '0012_1013_2332_3102_3102': ['3102', 23],
    '0012_1021_1323_2321_3003': ['1320', 26],
    '0012_1022_2323_3011_3013': ['3012', 23],
    '0012_1023_2011_3210_3233': ['3210', 22],
    '0012_1030_2101_2123_2333': ['2103', 22],
    '0012_1031_2201_3021_3233': ['3210', 25],
    '0012_1032_2013_2113_3302': ['2013', 27],
    '0012_1033_1320_2120_3321': ['1320', 25],
    '0012_1120_2300_3213_3213': ['3210', 22],
    '0012_1200_1231_2032_3133': ['1230', 23],
    '0012_1201_3021_3103_3223': ['3102', 23],
    '0012_1203_1320_2131_3023': ['1320', 23],
    '0012_1210_2310_2330_3123': ['2310', 24],
    '0012_1213_1330_2021_2033': ['2031', 24],
    '0012_1221_1303_2130_3203': ['1302', 26],
    '0012_1223_3010_3210_3213': ['3210', 19],
    '0012_1231_1310_2323_3200': ['1230', 27],
    '0012_1232_3010_3110_3232': ['3012', 24],
    '0012_1300_2131_3013_3222': ['3210', 27],
    '0012_1302_2010_2313_3123': ['2310', 26],
    '0012_1310_1322_2231_3003': ['1320', 24],
    '0012_1312_2030_2113_3203': ['2031', 27],
    '0012_1320_2031_2323_3101': ['2031', 26],
    '0012_1322_2310_2330_3101': ['2310', 23],
    '0012_1331_2010_2132_2330': ['2130', 24],
    '0012_2000_3112_3131_3232': ['3120', 24],
    '0012_2012_2103_3021_3133': ['3021', 26],
    '0012_2030_2032_3131_3211': ['2031', 23],
    '0012_2101_2103_2123_3033': ['2103', 18],
    '0012_2112_3002_3012_3133': ['3012', 23],
    '0012_2131_3021_3200_3231': ['3210', 23],
    '0012_2322_3010_3011_3213': ['3012', 21],
    '0100_0112_0322_2311_3233': ['0123', 23],
    '0100_0121_2023_2331_3213': ['0132', 24],
    '0100_0123_0221_2313_3132': ['0123', 20],
    '0100_0201_1233_2133_3212': ['0132', 27],
    '0100_0211_1332_2123_3230': ['0132', 27],
    '0100_0213_0321_1223_3231': ['0321', 23],
    '0100_0221_0223_1213_1333': ['0231', 24],
    '0100_0222_2132_3031_3131': ['0231', 26],
    '0100_0230_1321_1333_2122': ['1320', 25],
    '0100_0232_1021_1332_2313': ['1023', 26],
    '0100_0233_1221_1320_3213': ['1320', 26],
    '0100_1012_2313_2321_3032': ['2310', 24],
    '0100_1022_2330_3123_3211': ['3210', 26],
    '0100_1201_1330_2322_3132': ['1203', 26],
    '0100_1203_2023_3123_3211': ['3120', 26],
    '0100_1213_1213_2300_3223': ['1203', 26],
    '0100_1221_1332_1332_2300': ['1320', 24],
    '0100_1223_3022_3113_3201': ['3201', 24],
    '0100_1232_2100_3123_3213': ['3120', 27],
    '0100_2012_2031_3213_3213': ['3210', 21],
    '0100_2032_3102_3112_3132': ['3102', 20],
    '0101_0101_2132_2303_3232': ['0123', 26],
    '0101_0120_0123_2133_3232': ['0123', 18],
    '0101_0122_0232_0312_1333': ['0123', 19],
    '0101_0123_0220_3113_3232': ['0123', 22],
    '0101_0123_2031_2031_2323': ['2031', 20],
    '0101_0203_0231_1323_3212': ['0231', 23],
    '0101_0210_1313_2332_3220': ['0213', 26],
    '0101_0212_1203_2133_2303': ['2301', 25],
    '0101_0213_1203_1223_2303': ['1203', 24],
    '0101_0220_1332_2103_3132': ['0231', 26],
    '0101_0222_0322_1331_3130': ['0132', 26],
    '0101_0223_1031_2302_3213': ['0132', 27],
    '0101_0230_0233_2131_3221': ['0231', 20],
    '0101_0231_1203_2332_3120': ['0231', 25],
    '0101_0232_1210_2303_2331': ['2301', 24],
    '0101_0233_1023_2123_3201': ['0132', 26],
    '0101_1002_1033_1332_3222': ['1032', 23],
    '0101_1022_1303_2331_3202': ['1302', 26],
    '0101_1200_1321_2333_3220': ['1320', 27],
    '0101_1203_2023_2132_3013': ['2130', 25],
    '0101_1220_2331_3020_3123': ['3021', 26],
    '0101_1230_2103_2302_2313': ['2301', 21],
    '0101_1233_2132_3022_3100': ['3102', 26],
    '0101_2013_2123_3021_3023': ['3021', 22],
    '0101_2033_3102_3201_3221': ['3201', 20],
    '0102_0102_2331_3132_3201': ['3201', 23],
    '0102_0111_2033_2331_3220': ['0123', 26],
    '0102_0113_0132_0323_1232': ['0132', 16],
    '0102_0113_2102_3032_3132': ['0123', 26],
    '0102_0121_0323_2302_3113': ['0123', 22],
    '0102_0122_1032_1330_1332': ['1032', 23],
    '0102_0123_0321_3120_3132': ['0123', 20],
    '0102_0123_2130_2133_3120': ['2130', 23],
    '0102_0131_0223_0323_3121': ['0132', 19],
    '0102_0132_0132_0312_1233': ['0132', 14],
    '0102_0132_1213_3020_3123': ['0132', 24],
    '0102_0133_0231_2113_2320': ['0132', 22],
    '0102_0133_2011_3201_3223': ['0132', 24],
    '0102_0203_2302_3113_3121': ['3120', 24],
    '0102_0211_1320_2331_3203': ['0213', 27],
    '0102_0213_0231_0233_3121': ['0231', 15],
    '0102_0213_1322_1330_3120': ['1320', 25],
    '0102_0221_1213_1333_2003': ['0231', 28],
    '0102_0223_1233_1320_3101': ['1320', 25],
    '0102_0231_0311_3203_3212': ['0312', 23],
    '0102_0231_2032_2131_3103': ['0231', 24],
    '0102_0233_0311_1220_2133': ['0231', 24],
    '0102_0233_2113_3012_3201': ['3201', 24],
    '0102_0311_0332_1023_3221': ['0312', 22],
    '0102_0312_1032_1320_1332': ['1320', 21],
    '0102_0313_1023_2031_2132': ['2031', 25],
    '0102_0320_1303_2123_3112': ['0321', 25],
    '0102_0321_1331_2120_3203': ['0321', 25],
    '0102_0323_1021_2123_3103': ['0321', 25],
    '0102_0330_1312_2102_2133': ['2103', 25],
    '0102_0331_2312_3100_3221': ['3201', 26],
    '0102_0333_1032_2023_2111': ['2013', 28],
    '0102_1003_1232_1331_3022': ['1230', 23],
    '0102_1022_1033_1203_2313': ['1032', 22],
    '0102_1030_1221_2303_3213': ['1230', 26],
    '0102_1032_1303_2130_3212': ['1032', 25],
    '0102_1200_1320_1332_3231': ['1320', 21],
    '0102_1203_2101_2303_3213': ['2301', 25],
    '0102_1223_2302_3010_3113': ['3120', 27],
    '0102_1232_1332_3110_3200': ['1230', 25],
    '0102_1302_1320_2023_3113': ['1320', 21],
    '0102_1321_1331_3020_3202': ['1320', 23],
    '0102_1331_2300_3012_3221': ['3012', 26],
    '0102_2013_3011_3023_3221': ['3021', 22],
    '0102_2113_3012_3012_3023': ['3012', 18],
    '0110_0110_2303_3213_3222': ['3210', 25],
    '0110_0122_1303_2331_3022': ['0123', 25],
    '0110_0210_1323_1323_3022': ['1320', 23],
    '0110_0213_0333_1221_2032': ['0213', 23],
    '0110_0222_1032_1333_3210': ['1032', 25],
    '0110_0230_0322_1321_2133': ['0123', 24],
    '0110_0232_1223_2031_3013': ['0132', 26],
    '0110_1002_1202_1333_3223': ['1203', 24],
    '0110_1202_2011_2330_2333': ['2013', 23],
    '0110_1231_2032_3022_3103': ['1230', 26],
    '0110_2033_2302_3102_3112': ['3102', 25],
    '0111_0123_3022_3023_3210': ['3021', 20],
    '0111_0223_0230_2031_3123': ['0231', 22],
    '0111_0230_2330_3201_3212': ['3201', 24],
    '0111_0233_2012_2033_2103': ['2031', 22],
    '0111_2003_2103_2312_2330': ['2310', 20],
    '0112_0120_1303_1322_2303': ['1302', 23],
    '0112_0123_0322_1303_2301': ['0123', 21],
    '0112_0131_0231_2330_3220': ['0132', 22],
    '0112_0132_2303_3001_3221': ['0132', 24],
    '0112_0210_2013_2033_3213': ['2031', 23],
    '0112_0213_2013_2303_3012': ['0213', 24],
    '0112_0230_1233_1320_2301': ['1203', 27],
    '0112_0232_1020_2331_3013': ['0231', 26],
    '0112_0233_2031_3121_3200': ['3201', 26],
    '0112_0313_0322_2312_3001': ['0321', 21],
    '0112_0321_1332_2300_3210': ['0321', 26],
    '0112_0332_1022_3013_3102': ['3102', 27],
    '0112_1032_1323_2302_3100': ['1032', 26],
    '0112_1233_2032_2100_3103': ['2031', 26],
    '0112_2031_3100_3203_3212': ['3210', 21],
    '0120_0123_0213_2103_2313': ['0123', 21],
    '0120_0132_1233_1301_2302': ['0123', 23],
    '0120_0213_1033_1231_2302': ['0213', 25],
    '0120_0233_2103_2130_2131': ['2130', 18],
    '0120_0322_2013_2313_3011': ['2310', 25],
    '0120_1230_2011_2033_3213': ['2031', 23],
    '0121_0123_0322_1233_3010': ['0123', 19],
    '0121_0233_0321_2031_2310': ['0123', 23],
    '0122_0133_0213_2310_3201': ['0132', 22]
  }
};
