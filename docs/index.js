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
  var shareButtonRect;
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
    shareButtonRect = new Rect(
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
      } else if (shareButtonRect.contains(x, y)) {
        commandShare();
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
    var normalBoardCode = normalizeBoardCode(boardCode);
    routeLimit = problemTable[board.length][normalBoardCode];
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
            var patternCode = normalizeBoardCode(boardCode);
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

  function commandShare() {
    openUrl(
      'https://twitter.com/share?text=' +
        encodeURIComponent(document.title) +
        '&url=' +
        encodeURIComponent('https://stackshub.github.io/stacks/#' + boardCode) +
        '&hashtags=' +
        encodeURIComponent(appName)
    );
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
    paintButton('Tweet', shareButtonRect);
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

function normalizeBoardCode(boardCode) {
  var stackCodes = boardCode.split('_');
  var permutations = permutationTable[stackCodes.length - 1];
  var minBoardCode;
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
    if (!minBoardCode || bc < minBoardCode) {
      minBoardCode = bc;
    }
  }
  return minBoardCode;
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
    '00_01_11': 5,
    '01_01_10': 4
  },
  4: {
    '000_011_112_222': 16,
    '000_011_121_222': 14,
    '000_011_122_122': 13,
    '000_011_122_212': 16,
    '000_011_122_221': 15,
    '000_011_211_222': 16,
    '000_011_212_212': 13,
    '000_011_212_221': 15,
    '000_011_221_221': 13,
    '000_012_111_222': 14,
    '000_012_112_122': 15,
    '000_012_112_212': 14,
    '000_012_112_221': 14,
    '000_012_121_122': 13,
    '000_012_121_212': 13,
    '000_012_121_221': 12,
    '000_012_122_211': 15,
    '000_012_211_212': 14,
    '000_012_211_221': 13,
    '000_101_112_222': 15,
    '000_101_121_222': 15,
    '000_101_122_122': 11,
    '000_101_122_212': 15,
    '000_101_122_221': 15,
    '000_101_212_212': 12,
    '000_101_212_221': 14,
    '000_101_221_221': 16,
    '000_102_112_122': 12,
    '000_102_112_212': 14,
    '000_102_112_221': 14,
    '000_102_121_122': 10,
    '000_102_121_212': 14,
    '000_102_121_221': 14,
    '000_102_122_211': 14,
    '000_102_211_212': 13,
    '000_102_211_221': 15,
    '000_110_112_222': 17,
    '000_110_122_122': 11,
    '000_110_122_212': 15,
    '000_110_122_221': 15,
    '000_110_212_212': 13,
    '000_110_212_221': 15,
    '000_110_221_221': 16,
    '000_112_120_122': 10,
    '000_112_120_212': 14,
    '000_112_120_221': 14,
    '000_112_122_210': 15,
    '000_112_210_212': 12,
    '000_120_121_122': 8,
    '000_120_121_212': 12,
    '000_120_122_211': 12,
    '000_120_211_212': 13,
    '001_001_122_122': 13,
    '001_001_122_212': 16,
    '001_001_122_221': 16,
    '001_001_212_212': 13,
    '001_001_212_221': 14,
    '001_001_221_221': 16,
    '001_002_112_122': 14,
    '001_002_112_212': 15,
    '001_002_112_221': 16,
    '001_002_121_122': 12,
    '001_002_121_212': 16,
    '001_002_122_211': 16,
    '001_010_122_122': 13,
    '001_010_122_212': 15,
    '001_010_122_221': 14,
    '001_010_212_212': 13,
    '001_010_212_221': 14,
    '001_011_022_122': 13,
    '001_011_022_212': 12,
    '001_011_022_221': 12,
    '001_011_122_202': 15,
    '001_011_122_220': 15,
    '001_011_202_212': 15,
    '001_011_202_221': 14,
    '001_011_212_220': 14,
    '001_012_012_122': 9,
    '001_012_012_212': 9,
    '001_012_012_221': 8,
    '001_012_021_122': 11,
    '001_012_021_212': 10,
    '001_012_021_221': 10,
    '001_012_022_112': 12,
    '001_012_022_121': 11,
    '001_012_022_211': 12,
    '001_012_102_122': 14,
    '001_012_102_212': 14,
    '001_012_102_221': 13,
    '001_012_112_202': 14,
    '001_012_112_220': 14,
    '001_012_120_122': 12,
    '001_012_120_212': 14,
    '001_012_120_221': 13,
    '001_012_121_202': 13,
    '001_012_121_220': 13,
    '001_012_122_201': 14,
    '001_012_122_210': 14,
    '001_012_201_212': 14,
    '001_012_201_221': 13,
    '001_012_202_211': 14,
    '001_012_210_212': 12,
    '001_012_210_221': 13,
    '001_012_211_220': 14,
    '001_020_112_212': 13,
    '001_020_112_221': 14,
    '001_020_121_122': 13,
    '001_020_121_212': 14,
    '001_020_121_221': 15,
    '001_020_122_211': 15,
    '001_020_211_212': 12,
    '001_021_021_122': 9,
    '001_021_021_212': 8,
    '001_021_021_221': 11,
    '001_021_022_112': 9,
    '001_021_022_121': 10,
    '001_021_022_211': 10,
    '001_021_102_122': 14,
    '001_021_102_212': 13,
    '001_021_102_221': 15,
    '001_021_112_202': 13,
    '001_021_112_220': 13,
    '001_021_120_122': 12,
    '001_021_120_212': 13,
    '001_021_120_221': 15,
    '001_021_121_202': 14,
    '001_021_121_220': 14,
    '001_021_122_201': 14,
    '001_021_122_210': 14,
    '001_021_201_212': 13,
    '001_021_201_221': 15,
    '001_021_202_211': 14,
    '001_021_210_212': 12,
    '001_021_211_220': 14,
    '001_022_101_122': 15,
    '001_022_101_212': 14,
    '001_022_101_221': 15,
    '001_022_102_121': 14,
    '001_022_102_211': 15,
    '001_022_110_122': 15,
    '001_022_110_212': 14,
    '001_022_110_221': 15,
    '001_022_112_201': 14,
    '001_022_112_210': 14,
    '001_022_120_121': 12,
    '001_022_120_211': 15,
    '001_022_121_201': 15,
    '001_022_121_210': 15,
    '001_022_201_211': 14,
    '001_022_210_211': 11,
    '001_100_122_122': 11,
    '001_100_122_212': 15,
    '001_100_122_221': 15,
    '001_100_212_212': 12,
    '001_101_122_202': 14,
    '001_101_122_220': 15,
    '001_101_202_212': 14,
    '001_102_102_122': 9,
    '001_102_102_212': 11,
    '001_102_102_221': 11,
    '001_102_120_122': 9,
    '001_102_120_212': 13,
    '001_102_120_221': 13,
    '001_102_121_202': 13,
    '001_102_121_220': 14,
    '001_102_122_201': 14,
    '001_102_122_210': 14,
    '001_102_201_212': 13,
    '001_102_202_211': 14,
    '001_102_210_212': 11,
    '001_110_202_212': 15,
    '001_112_201_202': 12,
    '001_120_120_122': 7,
    '001_120_120_212': 11,
    '001_120_121_202': 11,
    '001_120_122_201': 12,
    '001_120_122_210': 12,
    '001_120_201_212': 13,
    '001_120_202_211': 14,
    '001_120_210_212': 11,
    '001_121_122_200': 13,
    '001_121_200_212': 14,
    '001_121_201_202': 12,
    '001_121_202_210': 13,
    '001_122_200_211': 14,
    '001_122_201_201': 12,
    '001_122_201_210': 12,
    '001_122_210_210': 10,
    '001_200_211_212': 10,
    '001_201_201_212': 10,
    '001_201_202_211': 10,
    '001_201_210_212': 9,
    '001_202_210_211': 9,
    '001_210_210_212': 7,
    '010_010_122_122': 13,
    '010_010_122_212': 13,
    '010_010_212_212': 14,
    '010_011_022_122': 11,
    '010_011_022_212': 11,
    '010_011_122_202': 13,
    '010_011_202_212': 13,
    '010_012_012_122': 7,
    '010_012_012_212': 7,
    '010_012_021_122': 9,
    '010_012_021_212': 9,
    '010_012_022_121': 9,
    '010_012_022_211': 10,
    '010_012_102_122': 12,
    '010_012_102_212': 12,
    '010_012_120_122': 12,
    '010_012_120_212': 12,
    '010_012_121_202': 11,
    '010_012_122_201': 12,
    '010_012_122_210': 12,
    '010_012_201_212': 12,
    '010_012_202_211': 12,
    '010_012_210_212': 13,
    '010_020_121_212': 15,
    '010_020_122_211': 15,
    '010_021_021_122': 9,
    '010_021_021_212': 8,
    '010_021_022_121': 10,
    '010_021_022_211': 10,
    '010_021_102_122': 14,
    '010_021_102_212': 13,
    '010_021_120_122': 12,
    '010_021_120_212': 14,
    '010_021_121_202': 13,
    '010_021_122_201': 14,
    '010_021_122_210': 14,
    '010_021_201_212': 13,
    '010_021_202_211': 14,
    '010_022_101_122': 15,
    '010_022_101_212': 14,
    '010_022_102_211': 15,
    '010_022_120_211': 15,
    '010_022_121_201': 14,
    '010_022_121_210': 15,
    '010_022_201_211': 13,
    '010_022_210_211': 12,
    '010_100_122_122': 11,
    '010_100_122_212': 15,
    '010_102_102_122': 9,
    '010_102_102_212': 11,
    '010_102_120_122': 9,
    '010_102_120_212': 13,
    '010_102_122_201': 14,
    '010_102_122_210': 14,
    '010_120_120_122': 7,
    '010_120_122_201': 12,
    '010_120_122_210': 12,
    '010_122_200_211': 14,
    '010_122_201_201': 10,
    '010_122_201_210': 12,
    '010_122_210_210': 11,
    '011_011_022_022': 9,
    '011_012_012_022': 5,
    '011_012_021_022': 7,
    '011_012_022_102': 10,
    '011_012_022_120': 10,
    '011_012_022_201': 10,
    '011_012_022_210': 10,
    '011_012_122_200': 12,
    '011_021_122_200': 14,
    '011_022_100_122': 15,
    '011_022_102_102': 11,
    '011_022_102_120': 13,
    '011_022_102_201': 15,
    '011_022_102_210': 15,
    '011_022_120_120': 11,
    '011_022_120_210': 15,
    '012_012_012_021': 4,
    '012_012_012_102': 6,
    '012_012_012_120': 6,
    '012_012_012_201': 6,
    '012_012_012_210': 6,
    '012_012_021_021': 6,
    '012_012_021_102': 8,
    '012_012_021_120': 8,
    '012_012_021_201': 8,
    '012_012_021_210': 8,
    '012_012_102_102': 11,
    '012_012_102_120': 11,
    '012_012_102_201': 11,
    '012_012_102_210': 11,
    '012_012_120_120': 11,
    '012_012_120_201': 11,
    '012_012_120_210': 11,
    '012_012_201_210': 11,
    '012_012_210_210': 12,
    '012_021_102_120': 13,
    '012_021_102_201': 13,
    '012_021_102_210': 13,
    '012_021_120_210': 13
  },
  5: {
    '0000_0111_1122_2223_3333': 30,
    '0000_0121_2223_2311_3313': 26,
    '0000_0123_2111_2332_3321': 26,
    '0000_1021_1323_3112_3322': 26,
    '0000_1023_1233_2311_2312': 23,
    '0000_1110_2231_3223_3231': 26,
    '0000_1121_1232_2330_3321': 27,
    '0000_1123_1302_1322_3132': 22,
    '0000_1210_2121_2133_2333': 22,
    '0001_0012_2312_2312_3331': 23,
    '0001_0023_1121_2313_3232': 28,
    '0001_0102_2131_3221_3332': 27,
    '0001_0112_1220_2333_3231': 27,
    '0001_0120_1233_2131_3223': 27,
    '0001_0121_1322_3312_3320': 26,
    '0001_0122_0333_3112_3212': 25,
    '0001_0122_2121_3310_3323': 26,
    '0001_0123_1120_1323_3322': 25,
    '0001_0123_2032_2132_3113': 25,
    '0001_0202_1131_2233_2313': 27,
    '0001_0210_1133_1332_2223': 28,
    '0001_0211_1320_2332_3231': 26,
    '0001_0212_1032_1233_3132': 25,
    '0001_0212_2211_3013_3332': 26,
    '0001_0213_1203_1313_2223': 27,
    '0001_0213_2132_3102_3213': 26,
    '0001_0221_1032_2133_3321': 27,
    '0001_0221_2213_3130_3231': 28,
    '0001_0222_1330_3211_3213': 23,
    '0001_0223_1133_1203_2231': 28,
    '0001_0223_2231_3131_3210': 26,
    '0001_0231_1112_2032_3233': 25,
    '0001_0231_2031_2231_3132': 26,
    '0001_0232_1123_2230_3131': 26,
    '0001_0232_2113_2133_3021': 25,
    '0001_0233_1211_2023_3132': 25,
    '0001_1001_2113_2322_2333': 23,
    '0001_1012_1232_2313_3302': 26,
    '0001_1020_2123_2331_3132': 27,
    '0001_1021_3022_3113_3223': 25,
    '0001_1022_2133_2331_3120': 26,
    '0001_1023_1312_3022_3231': 26,
    '0001_1101_2132_2233_2303': 23,
    '0001_1112_2012_2332_3303': 27,
    '0001_1120_2233_3023_3121': 27,
    '0001_1122_1301_2320_3323': 26,
    '0001_1123_1210_2203_3233': 28,
    '0001_1123_2201_2333_3012': 28,
    '0001_1201_1332_2303_3221': 26,
    '0001_1202_2021_2313_3331': 26,
    '0001_1203_1332_2310_2321': 23,
    '0001_1210_2132_2333_3012': 26,
    '0001_1212_1320_2330_3231': 27,
    '0001_1213_1320_1323_3220': 21,
    '0001_1220_1223_3033_3211': 26,
    '0001_1221_2023_2133_3310': 27,
    '0001_1222_3022_3103_3131': 22,
    '0001_1223_3102_3123_3210': 22,
    '0001_1231_2013_2321_3302': 25,
    '0001_1232_2102_3012_3313': 27,
    '0001_1233_2131_2301_3022': 26,
    '0001_2011_2233_2313_3012': 23,
    '0001_2013_2320_3211_3213': 22,
    '0001_2030_2131_2312_3321': 24,
    '0001_2100_2123_3212_3313': 24,
    '0001_2110_2131_2330_2332': 21,
    '0001_2121_2331_3123_3200': 26,
    '0010_0012_1332_2123_3231': 29,
    '0010_0023_1131_2313_2322': 23,
    '0010_0110_2132_2323_3312': 27,
    '0010_0112_2033_2133_3212': 26,
    '0010_0121_0332_1331_2322': 23,
    '0010_0122_0232_3113_3123': 23,
    '0010_0122_2023_3121_3133': 24,
    '0010_0123_1123_1232_3320': 25,
    '0010_0123_2122_3101_3323': 26,
    '0010_0202_2133_3131_3212': 26,
    '0010_0211_0233_1222_1333': 23,
    '0010_0212_0213_3131_3232': 19,
    '0010_0212_2013_2133_2331': 22,
    '0010_0213_1133_2232_3120': 27,
    '0010_0213_2211_2313_3032': 25,
    '0010_0221_1202_3131_3233': 27,
    '0010_0222_1031_2132_3133': 27,
    '0010_0223_1031_1231_2323': 25,
    '0010_0223_1331_2033_2112': 27,
    '0010_0231_0323_1212_3123': 23,
    '0010_0231_1332_2322_3011': 25,
    '0010_0232_1132_1323_3102': 25,
    '0010_0232_2311_3120_3312': 26,
    '0010_0233_1232_1301_2312': 26,
    '0010_1002_2313_2322_3311': 24,
    '0010_1012_2332_3122_3130': 24,
    '0010_1021_2231_3022_3133': 26,
    '0010_1022_2133_3021_3321': 26,
    '0010_1023_1323_2121_2303': 25,
    '0010_1102_1323_2321_3230': 27,
    '0010_1120_2233_3023_3112': 25,
    '0010_1122_2033_2121_3033': 27,
    '0010_1123_1332_3120_3220': 26,
    '0010_1200_2321_3211_3233': 24,
    '0010_1202_1321_3013_3223': 25,
    '0010_1203_1323_2112_3320': 26,
    '0010_1210_2230_3232_3311': 28,
    '0010_1212_2030_2133_3312': 26,
    '0010_1213_2031_2213_3320': 24,
    '0010_1220_2231_3032_3311': 27,
    '0010_1222_1323_2310_3013': 26,
    '0010_1223_2133_2231_3001': 25,
    '0010_1231_1233_1233_2002': 17,
    '0010_1232_2030_3131_3221': 27,
    '0010_1233_2123_2210_3013': 27,
    '0010_2011_3033_3221_3221': 23,
    '0010_2021_2132_3103_3312': 26,
    '0010_2031_2311_3120_3322': 25,
    '0010_2102_2311_2313_3230': 21,
    '0010_2113_2320_3130_3212': 27,
    '0011_0011_2233_3213_3220': 24,
    '0011_0021_0123_3232_3321': 21,
    '0011_0022_0132_1332_3123': 23,
    '0011_0023_0322_1233_1321': 24,
    '0011_0023_2012_3132_3312': 27,
    '0011_0102_1123_2330_3232': 27,
    '0011_0112_0230_3213_3322': 24,
    '0011_0120_0332_2123_3312': 24,
    '0011_0121_0323_1032_3223': 23,
    '0011_0122_0310_1323_2323': 23,
    '0011_0122_2011_3233_3302': 26,
    '0011_0123_0233_1202_3213': 24,
    '0011_0123_1232_3032_3102': 25,
    '0011_0200_1132_2322_3133': 26,
    '0011_0201_2231_2313_3023': 25,
    '0011_0202_1331_2230_3132': 28,
    '0011_0203_1133_2322_3021': 27,
    '0011_0203_2320_3211_3231': 24,
    '0011_0211_0230_2233_3312': 21,
    '0011_0212_0320_1233_2331': 24,
    '0011_0212_2103_2103_2333': 20,
    '0011_0213_0332_0332_1122': 21,
    '0011_0213_2023_3011_3322': 25,
    '0011_0220_1230_1313_3232': 26,
    '0011_0221_0331_2320_2331': 26,
    '0011_0221_2312_3023_3301': 26,
    '0011_0222_1320_2313_3103': 28,
    '0011_0223_1013_3132_3220': 26,
    '0011_0223_1303_1321_2023': 22,
    '0011_0230_0232_1323_3112': 21,
    '0011_0230_2023_2112_3133': 26,
    '0011_0231_1203_2201_3233': 26,
    '0011_0231_2303_3122_3201': 26,
    '0011_0232_1203_1331_2302': 24,
    '0011_0232_2113_2320_3103': 25,
    '0011_0233_1132_1203_2023': 26,
    '0011_0233_2021_2310_3321': 25,
    '0011_1002_2033_3212_3321': 26,
    '0011_1020_1233_2230_3312': 26,
    '0011_1022_1132_2330_2330': 26,
    '0011_1023_1203_1320_2332': 22,
    '0011_1023_2310_3202_3231': 25,
    '0011_1122_2003_2033_3231': 25,
    '0011_1200_1323_3013_3222': 26,
    '0011_1202_1323_2133_3002': 26,
    '0011_1203_2002_3131_3223': 28,
    '0011_1210_3212_3302_3302': 24,
    '0011_1220_1230_3231_3320': 25,
    '0011_1222_1230_3012_3033': 23,
    '0011_1223_3000_3112_3223': 26,
    '0011_1231_2021_2303_2303': 21,
    '0011_1233_2002_2102_3133': 28,
    '0011_2002_2113_3032_3213': 25,
    '0011_2011_2032_3132_3230': 24,
    '0011_2013_2301_2321_3032': 22,
    '0011_2023_2113_3103_3202': 26,
    '0011_2032_2130_3112_3320': 25,
    '0011_2103_2302_3112_3302': 26,
    '0012_0012_0312_1323_2331': 25,
    '0012_0013_0121_1323_3232': 23,
    '0012_0021_1102_1233_3233': 26,
    '0012_0023_1130_1322_2331': 25,
    '0012_0032_0131_1132_3223': 25,
    '0012_0101_0223_2133_3132': 24,
    '0012_0102_0332_2331_3112': 25,
    '0012_0103_0213_3213_3221': 24,
    '0012_0103_1332_3021_3122': 25,
    '0012_0110_2132_3231_3302': 27,
    '0012_0112_0132_0333_1223': 19,
    '0012_0112_1302_3123_3302': 27,
    '0012_0113_0222_3131_3230': 24,
    '0012_0113_1223_2313_3002': 28,
    '0012_0120_0133_2313_3122': 23,
    '0012_0120_3023_3121_3312': 23,
    '0012_0121_1230_1332_3302': 24,
    '0012_0122_0233_1213_3031': 23,
    '0012_0122_1330_2203_3113': 28,
    '0012_0123_0233_0331_2121': 20,
    '0012_0123_1102_1333_2203': 26,
    '0012_0123_2013_2332_3101': 26,
    '0012_0130_1132_3120_3223': 26,
    '0012_0131_0133_2122_2330': 21,
    '0012_0131_1033_2322_3120': 26,
    '0012_0131_2312_3013_3202': 26,
    '0012_0132_0321_3212_3310': 22,
    '0012_0132_1223_3030_3112': 26,
    '0012_0132_2321_3113_3200': 26,
    '0012_0133_0322_1321_2130': 24,
    '0012_0133_1223_2003_3112': 27,
    '0012_0200_1231_3231_3312': 25,
    '0012_0201_2131_3013_3223': 26,
    '0012_0203_0321_1313_2132': 22,
    '0012_0203_2113_3022_3113': 27,
    '0012_0210_2132_3130_3213': 26,
    '0012_0211_1233_2033_3021': 26,
    '0012_0212_0331_0331_2213': 20,
    '0012_0212_3102_3130_3132': 21,
    '0012_0213_1013_2301_3223': 26,
    '0012_0213_1320_2303_3211': 25,
    '0012_0220_1232_1303_1313': 22,
    '0012_0221_1102_2333_3031': 28,
    '0012_0222_1132_3003_3113': 26,
    '0012_0223_1033_1210_2331': 26,
    '0012_0230_0321_1233_1312': 23,
    '0012_0230_2131_2131_3023': 23,
    '0012_0231_1023_1023_3123': 22,
    '0012_0231_1323_2302_3101': 26,
    '0012_0232_0333_1011_1322': 25,
    '0012_0232_2011_3023_3131': 25,
    '0012_0233_1031_1302_2231': 25,
    '0012_0233_1331_2201_3210': 26,
    '0012_0301_1212_2303_3213': 26,
    '0012_0302_1022_1323_3113': 25,
    '0012_0303_0312_2123_2131': 22,
    '0012_0303_2121_2310_3321': 25,
    '0012_0310_2103_2123_3312': 24,
    '0012_0311_1233_1330_2022': 26,
    '0012_0312_0323_1310_2213': 20,
    '0012_0312_1233_2120_3103': 26,
    '0012_0313_0322_1201_3321': 22,
    '0012_0313_1230_2031_2312': 25,
    '0012_0320_1032_1123_3123': 24,
    '0012_0321_0323_1012_3132': 19,
    '0012_0321_1233_1330_2102': 25,
    '0012_0322_0333_1130_1221': 22,
    '0012_0322_2111_3013_3032': 25,
    '0012_0323_1210_2231_3013': 26,
    '0012_0330_1032_1232_3121': 25,
    '0012_0331_1012_2302_3321': 28,
    '0012_0331_1320_2102_3312': 27,
    '0012_0332_1032_1212_1330': 23,
    '0012_0332_2031_3012_3121': 25,
    '0012_0333_1231_2110_2320': 27,
    '0012_1002_1031_1332_2323': 23,
    '0012_1003_1233_2120_3312': 26,
    '0012_1011_1033_2322_3302': 25,
    '0012_1012_3022_3103_3123': 21,
    '0012_1013_2332_3102_3102': 23,
    '0012_1021_1323_2321_3003': 26,
    '0012_1022_2323_3011_3013': 23,
    '0012_1023_2011_3210_3233': 22,
    '0012_1030_2101_2123_2333': 22,
    '0012_1031_2201_3021_3233': 25,
    '0012_1032_2013_2113_3302': 27,
    '0012_1033_1320_2120_3321': 25,
    '0012_1120_2300_3213_3213': 22,
    '0012_1200_1231_2032_3133': 23,
    '0012_1201_3021_3103_3223': 23,
    '0012_1203_1320_2131_3023': 23,
    '0012_1210_2310_2330_3123': 24,
    '0012_1213_1330_2021_2033': 24,
    '0012_1221_1303_2130_3203': 26,
    '0012_1223_3010_3210_3213': 19,
    '0012_1231_1310_2323_3200': 27,
    '0012_1232_3010_3110_3232': 24,
    '0012_1300_2131_3013_3222': 27,
    '0012_1302_2010_2313_3123': 26,
    '0012_1310_1322_2231_3003': 24,
    '0012_1312_2030_2113_3203': 27,
    '0012_1320_2031_2323_3101': 26,
    '0012_1322_2310_2330_3101': 23,
    '0012_1331_2010_2132_2330': 24,
    '0012_2000_3112_3131_3232': 24,
    '0012_2012_2103_3021_3133': 26,
    '0012_2030_2032_3131_3211': 23,
    '0012_2101_2103_2123_3033': 18,
    '0012_2112_3002_3012_3133': 23,
    '0012_2131_3021_3200_3231': 23,
    '0012_2322_3010_3011_3213': 21,
    '0100_0112_0322_2311_3233': 23,
    '0100_0121_2023_2331_3213': 24,
    '0100_0123_0221_2313_3132': 20,
    '0100_0201_1233_2133_3212': 27,
    '0100_0211_1332_2123_3230': 27,
    '0100_0213_0321_1223_3231': 23,
    '0100_0221_0223_1213_1333': 24,
    '0100_0222_2132_3031_3131': 26,
    '0100_0230_1321_1333_2122': 25,
    '0100_0232_1021_1332_2313': 26,
    '0100_0233_1221_1320_3213': 26,
    '0100_1012_2313_2321_3032': 24,
    '0100_1022_2330_3123_3211': 26,
    '0100_1201_1330_2322_3132': 26,
    '0100_1203_2023_3123_3211': 26,
    '0100_1213_1213_2300_3223': 26,
    '0100_1221_1332_1332_2300': 24,
    '0100_1223_3022_3113_3201': 24,
    '0100_1232_2100_3123_3213': 27,
    '0100_2012_2031_3213_3213': 21,
    '0100_2032_3102_3112_3132': 20,
    '0101_0101_2132_2303_3232': 26,
    '0101_0120_0123_2133_3232': 18,
    '0101_0122_0232_0312_1333': 19,
    '0101_0123_0220_3113_3232': 22,
    '0101_0123_2031_2031_2323': 20,
    '0101_0203_0231_1323_3212': 23,
    '0101_0210_1313_2332_3220': 26,
    '0101_0212_1203_2133_2303': 25,
    '0101_0213_1203_1223_2303': 24,
    '0101_0220_1332_2103_3132': 26,
    '0101_0222_0322_1331_3130': 26,
    '0101_0223_1031_2302_3213': 27,
    '0101_0230_0233_2131_3221': 20,
    '0101_0231_1203_2332_3120': 25,
    '0101_0232_1210_2303_2331': 24,
    '0101_0233_1023_2123_3201': 26,
    '0101_1002_1033_1332_3222': 23,
    '0101_1022_1303_2331_3202': 26,
    '0101_1200_1321_2333_3220': 27,
    '0101_1203_2023_2132_3013': 25,
    '0101_1220_2331_3020_3123': 26,
    '0101_1230_2103_2302_2313': 21,
    '0101_1233_2132_3022_3100': 26,
    '0101_2013_2123_3021_3023': 22,
    '0101_2033_3102_3201_3221': 20,
    '0102_0102_2331_3132_3201': 23,
    '0102_0111_2033_2331_3220': 26,
    '0102_0113_0132_0323_1232': 16,
    '0102_0113_2102_3032_3132': 26,
    '0102_0121_0323_2302_3113': 22,
    '0102_0122_1032_1330_1332': 23,
    '0102_0123_0321_3120_3132': 20,
    '0102_0123_2130_2133_3120': 23,
    '0102_0131_0223_0323_3121': 19,
    '0102_0132_0132_0312_1233': 14,
    '0102_0132_1213_3020_3123': 24,
    '0102_0133_0231_2113_2320': 22,
    '0102_0133_2011_3201_3223': 24,
    '0102_0203_2302_3113_3121': 24,
    '0102_0211_1320_2331_3203': 27,
    '0102_0213_0231_0233_3121': 15,
    '0102_0213_1322_1330_3120': 25,
    '0102_0221_1213_1333_2003': 28,
    '0102_0223_1233_1320_3101': 25,
    '0102_0231_0311_3203_3212': 23,
    '0102_0231_2032_2131_3103': 24,
    '0102_0233_0311_1220_2133': 24,
    '0102_0233_2113_3012_3201': 24,
    '0102_0311_0332_1023_3221': 22,
    '0102_0312_1032_1320_1332': 21,
    '0102_0313_1023_2031_2132': 25,
    '0102_0320_1303_2123_3112': 25,
    '0102_0321_1331_2120_3203': 25,
    '0102_0323_1021_2123_3103': 25,
    '0102_0330_1312_2102_2133': 25,
    '0102_0331_2312_3100_3221': 26,
    '0102_0333_1032_2023_2111': 28,
    '0102_1003_1232_1331_3022': 23,
    '0102_1022_1033_1203_2313': 22,
    '0102_1030_1221_2303_3213': 26,
    '0102_1032_1303_2130_3212': 25,
    '0102_1200_1320_1332_3231': 21,
    '0102_1203_2101_2303_3213': 25,
    '0102_1223_2302_3010_3113': 27,
    '0102_1232_1332_3110_3200': 25,
    '0102_1302_1320_2023_3113': 21,
    '0102_1321_1331_3020_3202': 23,
    '0102_1331_2300_3012_3221': 26,
    '0102_2013_3011_3023_3221': 22,
    '0102_2113_3012_3012_3023': 18,
    '0110_0110_2303_3213_3222': 25,
    '0110_0122_1303_2331_3022': 25,
    '0110_0210_1323_1323_3022': 23,
    '0110_0213_0333_1221_2032': 23,
    '0110_0222_1032_1333_3210': 25,
    '0110_0230_0322_1321_2133': 24,
    '0110_0232_1223_2031_3013': 26,
    '0110_1002_1202_1333_3223': 24,
    '0110_1202_2011_2330_2333': 23,
    '0110_1231_2032_3022_3103': 26,
    '0110_2033_2302_3102_3112': 25,
    '0111_0123_3022_3023_3210': 20,
    '0111_0223_0230_2031_3123': 22,
    '0111_0230_2330_3201_3212': 24,
    '0111_0233_2012_2033_2103': 22,
    '0111_2003_2103_2312_2330': 20,
    '0112_0120_1303_1322_2303': 23,
    '0112_0123_0322_1303_2301': 21,
    '0112_0131_0231_2330_3220': 22,
    '0112_0132_2303_3001_3221': 24,
    '0112_0210_2013_2033_3213': 23,
    '0112_0213_2013_2303_3012': 24,
    '0112_0230_1233_1320_2301': 27,
    '0112_0232_1020_2331_3013': 26,
    '0112_0233_2031_3121_3200': 26,
    '0112_0313_0322_2312_3001': 21,
    '0112_0321_1332_2300_3210': 26,
    '0112_0332_1022_3013_3102': 27,
    '0112_1032_1323_2302_3100': 26,
    '0112_1233_2032_2100_3103': 26,
    '0112_2031_3100_3203_3212': 21,
    '0120_0123_0213_2103_2313': 21,
    '0120_0132_1233_1301_2302': 23,
    '0120_0213_1033_1231_2302': 25,
    '0120_0233_2103_2130_2131': 18,
    '0120_0322_2013_2313_3011': 25,
    '0120_1230_2011_2033_3213': 23,
    '0121_0123_0322_1233_3010': 19,
    '0121_0233_0321_2031_2310': 23,
    '0122_0133_0213_2310_3201': 22
  }
};
