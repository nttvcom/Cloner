export type Lang = 'en' | 'ru';

const STORAGE_KEY = 'cloner.lang';

const en: Record<string, string> = {
  'menu.title': 'CLONER',
  'menu.subtitle': 'a co-op puzzle about the clone you cannot touch',
  'menu.duo': 'Duo — one PC',
  'menu.online': 'Online co-op',
  'menu.help': 'How to play',
  'menu.lang': 'Language: EN',

  'help.title': 'How to play',
  'help.body': [
    'Two players. Each can drop a CLONE of themselves (a frozen copy).',
    '',
    'THE RULE: you can NEVER touch your own clone — you pass through it.',
    "The OTHER player's clone is completely solid for you.",
    '',
    'Placing a clone teleports you back to your spawn.',
    'To remove your clone, touch it and press your remove key.',
    '',
    'Clones press buttons, block lasers and ride platforms.',
    'Buttons only work while something stands on them.',
    'Lasers kill players instantly — any death resets the level.',
    '',
    'Player 1: WASD to move, E place clone, F remove',
    'Player 2: Arrows to move, K place clone, L remove',
  ].join('\n'),
  'help.back': 'Back',

  'select.title': 'Select level',
  'select.locked': 'locked',
  'select.back': 'Back',

  'online.title': 'Online co-op',
  'online.host': 'Host a room',
  'online.join': 'Join a room',
  'online.enterCode': 'Enter room code:',
  'online.connecting': 'Connecting…',
  'online.back': 'Back',
  'online.error.notFound': 'Room not found',
  'online.error.full': 'Room is full',
  'online.error.invalidCode': 'Invalid room code',
  'online.error.codeTaken': 'That code is taken',
  'online.error.connect': 'Could not reach the server',

  'lobby.title': 'Room',
  'lobby.you': 'you',
  'lobby.waiting': 'waiting…',
  'lobby.ready': 'READY',
  'lobby.notReady': 'not ready',
  'lobby.hint': 'press SPACE to toggle ready',
  'lobby.peerLeft': 'The other player left.',
  'lobby.leave': 'Leave',

  'game.complete': 'LEVEL COMPLETE!',
  'game.nextHint': 'press SPACE for the next level',
  'game.finished': 'All levels complete — thanks for playing!',
  'game.finishedHint': 'press SPACE to return to the menu',
  'game.nextOnline': 'next level starting…',
  'game.peerLeft': 'The other player disconnected',
  'game.menuHint': 'ESC — menu',
  'game.clones': 'clones',

  'level.01.name': 'First Steps',
  'level.02.name': "A Friend's Shoulder",
  'level.03.name': 'Dead Weight',
  'level.04.name': 'Firewall',
  'level.05.name': 'Lift Service',
  'level.06.name': 'The Ferry',
  'level.07.name': 'Scaffolding',
  'level.08.name': 'Hand in Hand',
  'level.test.name': 'Sandbox',
};

const ru: Record<string, string> = {
  'menu.title': 'CLONER',
  'menu.subtitle': 'кооперативная головоломка про клона, которого нельзя касаться',
  'menu.duo': 'Дуэт — один ПК',
  'menu.online': 'Онлайн-кооператив',
  'menu.help': 'Как играть',
  'menu.lang': 'Язык: RU',

  'help.title': 'Как играть',
  'help.body': [
    'Два игрока. Каждый может поставить КЛОНА — застывшую копию себя.',
    '',
    'ПРАВИЛО: своего клона коснуться НЕЛЬЗЯ — вы проходите сквозь него.',
    'Клон ДРУГОГО игрока для вас полностью твёрдый.',
    '',
    'Установка клона телепортирует вас на точку возрождения.',
    'Чтобы убрать клона — коснитесь его и нажмите клавишу удаления.',
    '',
    'Клоны давят кнопки, блокируют лазеры и ездят на платформах.',
    'Кнопки работают, только пока на них кто-то стоит.',
    'Лазер убивает мгновенно — любая смерть перезапускает уровень.',
    '',
    'Игрок 1: WASD — движение, E — клон, F — убрать',
    'Игрок 2: стрелки — движение, K — клон, L — убрать',
  ].join('\n'),
  'help.back': 'Назад',

  'select.title': 'Выбор уровня',
  'select.locked': 'закрыт',
  'select.back': 'Назад',

  'online.title': 'Онлайн-кооператив',
  'online.host': 'Создать комнату',
  'online.join': 'Войти по коду',
  'online.enterCode': 'Введите код комнаты:',
  'online.connecting': 'Подключение…',
  'online.back': 'Назад',
  'online.error.notFound': 'Комната не найдена',
  'online.error.full': 'Комната заполнена',
  'online.error.invalidCode': 'Неверный код комнаты',
  'online.error.codeTaken': 'Код уже занят',
  'online.error.connect': 'Не удалось подключиться к серверу',

  'lobby.title': 'Комната',
  'lobby.you': 'вы',
  'lobby.waiting': 'ожидание…',
  'lobby.ready': 'ГОТОВ',
  'lobby.notReady': 'не готов',
  'lobby.hint': 'SPACE — готовность',
  'lobby.peerLeft': 'Второй игрок вышел.',
  'lobby.leave': 'Выйти',

  'game.complete': 'УРОВЕНЬ ПРОЙДЕН!',
  'game.nextHint': 'SPACE — следующий уровень',
  'game.finished': 'Все уровни пройдены — спасибо за игру!',
  'game.finishedHint': 'SPACE — вернуться в меню',
  'game.nextOnline': 'следующий уровень запускается…',
  'game.peerLeft': 'Второй игрок отключился',
  'game.menuHint': 'ESC — меню',
  'game.clones': 'клоны',

  'level.01.name': 'Первые шаги',
  'level.02.name': 'Плечо друга',
  'level.03.name': 'Мёртвый груз',
  'level.04.name': 'Фаервол',
  'level.05.name': 'Лифт-сервис',
  'level.06.name': 'Паром',
  'level.07.name': 'Строительные леса',
  'level.08.name': 'Рука об руку',
  'level.test.name': 'Песочница',
};

const dictionaries: Record<Lang, Record<string, string>> = { en, ru };

let current: Lang = ((): Lang => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'ru' || saved === 'en' ? saved : 'en';
})();

export function t(key: string): string {
  return dictionaries[current][key] ?? dictionaries.en[key] ?? key;
}

export function getLang(): Lang {
  return current;
}

export function toggleLang(): Lang {
  current = current === 'en' ? 'ru' : 'en';
  localStorage.setItem(STORAGE_KEY, current);
  return current;
}
