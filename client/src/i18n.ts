export type Lang = 'en' | 'ru';

const STORAGE_KEY = 'cloner.lang';

const en: Record<string, string> = {
  'menu.subtitle': 'a co-op puzzle about the clone you cannot touch',
  'menu.duo': 'Duo — one PC',
  'menu.online': 'Online co-op',
  'menu.help': 'How to play',
  'menu.langLabel': 'Language',

  'help.title': 'How to play',
  'help.iconPlayer': 'player',
  'help.iconClone': 'clone',
  'help.body': [
    'Each player can drop a CLONE — a frozen copy of themselves.',
    '',
    'THE RULE: you can NEVER touch your own clone — you pass through it.',
    "The OTHER player's clone is completely solid for you.",
    '',
    'Placing a clone teleports you back to your spawn.',
    'To remove your clone, touch it and press your remove key.',
    '',
    'Clones press buttons, block lasers, ride and jam platforms.',
    'Buttons only work while something stands on them.',
    'Lasers kill instantly — any death resets the whole level.',
    '',
    'Player 1: WASD move · E place clone · F remove',
    'Player 2: Arrows move · K place clone · L remove',
  ].join('\n'),
  'help.back': 'Back',

  'select.title': 'Select level',
  'select.locked': 'locked',
  'select.back': 'Back',

  'online.title': 'Online co-op',
  'online.host': 'Host a room',
  'online.join': 'Join a room',
  'online.enterCode': 'Enter room code and press Enter:',
  'online.connecting': 'Connecting…',
  'online.back': 'Back',
  'online.error.notFound': 'Room not found',
  'online.error.full': 'Room is full',
  'online.error.invalidCode': 'Invalid room code',
  'online.error.codeTaken': 'That code is taken',
  'online.error.connect': 'Could not reach the server',

  'lobby.title': 'Room',
  'lobby.shareHint': 'share this code with the other player',
  'lobby.levelLabel': 'starting level',
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

  'level.01.name': 'First Clone',
  'level.02.name': 'Dead Weight',
  'level.03.name': 'Parting Ways',
  'level.04.name': 'Airlock',
  'level.05.name': 'Firewall',
  'level.06.name': 'Lift Service',
  'level.07.name': 'The Ferry',
  'level.08.name': 'The Tower',
  'level.09.name': 'Double Curtain',
  'level.10.name': 'Tandem',
  'level.11.name': 'Beam Rider',
  'level.12.name': 'Round Trip',
  'level.13.name': 'High Ground',
  'level.14.name': 'Stop the Ferry',
  'level.15.name': 'The Vault',
  'level.16.name': 'Climbing Party',
  'level.17.name': 'Watchtower',
  'level.18.name': 'The Conveyor',
  'level.19.name': 'Clockwork',
  'level.20.name': 'Hand in Hand',
  'level.test.name': 'Sandbox',
};

const ru: Record<string, string> = {
  'menu.subtitle': 'кооперативная головоломка про клона, которого нельзя касаться',
  'menu.duo': 'Дуэт — один ПК',
  'menu.online': 'Онлайн-кооператив',
  'menu.help': 'Как играть',
  'menu.langLabel': 'Язык',

  'help.title': 'Как играть',
  'help.iconPlayer': 'игрок',
  'help.iconClone': 'клон',
  'help.body': [
    'Каждый игрок может поставить КЛОНА — застывшую копию себя.',
    '',
    'ПРАВИЛО: своего клона коснуться НЕЛЬЗЯ — вы проходите сквозь него.',
    'Клон ДРУГОГО игрока для вас полностью твёрдый.',
    '',
    'Установка клона телепортирует вас на точку возрождения.',
    'Чтобы убрать клона — коснитесь его и нажмите клавишу удаления.',
    '',
    'Клоны давят кнопки, блокируют лазеры, ездят на платформах и клинят их.',
    'Кнопки работают, только пока на них кто-то стоит.',
    'Лазер убивает мгновенно — любая смерть перезапускает весь уровень.',
    '',
    'Игрок 1: WASD — движение · E — клон · F — убрать',
    'Игрок 2: стрелки — движение · K — клон · L — убрать',
  ].join('\n'),
  'help.back': 'Назад',

  'select.title': 'Выбор уровня',
  'select.locked': 'закрыт',
  'select.back': 'Назад',

  'online.title': 'Онлайн-кооператив',
  'online.host': 'Создать комнату',
  'online.join': 'Войти по коду',
  'online.enterCode': 'Введите код комнаты и нажмите Enter:',
  'online.connecting': 'Подключение…',
  'online.back': 'Назад',
  'online.error.notFound': 'Комната не найдена',
  'online.error.full': 'Комната заполнена',
  'online.error.invalidCode': 'Неверный код комнаты',
  'online.error.codeTaken': 'Код уже занят',
  'online.error.connect': 'Не удалось подключиться к серверу',

  'lobby.title': 'Комната',
  'lobby.shareHint': 'передайте этот код второму игроку',
  'lobby.levelLabel': 'стартовый уровень',
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

  'level.01.name': 'Первый клон',
  'level.02.name': 'Мёртвый груз',
  'level.03.name': 'Каждому своё',
  'level.04.name': 'Шлюз',
  'level.05.name': 'Фаервол',
  'level.06.name': 'Лифт-сервис',
  'level.07.name': 'Паром',
  'level.08.name': 'Башня',
  'level.09.name': 'Двойная завеса',
  'level.10.name': 'Тандем',
  'level.11.name': 'Сквозь луч',
  'level.12.name': 'Туда и обратно',
  'level.13.name': 'Высота',
  'level.14.name': 'Останови паром',
  'level.15.name': 'Сейф',
  'level.16.name': 'Скалолазы',
  'level.17.name': 'Дозорная башня',
  'level.18.name': 'Конвейер',
  'level.19.name': 'Часовой механизм',
  'level.20.name': 'Рука об руку',
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
