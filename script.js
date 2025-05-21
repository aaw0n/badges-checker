// Sauvegarde et récupération des jeux dans localStorage
const STORAGE_KEY = 'robloxTrackedGames';

let games = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

const usernameInput = document.getElementById('username');
const gameIdInput = document.getElementById('gameIdInput');
const addGameBtn = document.getElementById('addGameBtn');
const gamesList = document.getElementById('gamesList');
const results = document.getElementById('results');

// Affiche la liste des jeux suivis
function renderGames() {
  gamesList.innerHTML = '';
  games.forEach(game => {
    const li = document.createElement('li');
    li.className = 'list-group-item game-list-item';
    li.textContent = `${game.name || 'Jeu #' + game.id} (ID: ${game.id})`;
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm btn-danger';
    btn.textContent = 'Supprimer';
    btn.onclick = () => {
      games = games.filter(g => g.id !== game.id);
      saveGames();
      renderGames();
      if (usernameInput.value.trim()) {
        loadAllBadges(usernameInput.value.trim());
      }
    };
    li.appendChild(btn);
    gamesList.appendChild(li);
  });
}

// Sauvegarde la liste dans localStorage
function saveGames() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}

// Fetch des infos du jeu pour récupérer le nom
async function fetchGameName(gameId) {
  try {
    const res = await fetch(`https://games.roblox.com/v1/games?universeIds=${gameId}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.data && data.data.length > 0) return data.data[0].name;
    return null;
  } catch {
    return null;
  }
}

// Ajouter un jeu (avec vérification)
addGameBtn.onclick = async () => {
  const idStr = gameIdInput.value.trim();
  if (!idStr.match(/^\d+$/)) {
    alert('Veuillez entrer un ID de jeu Roblox valide (chiffres uniquement).');
    return;
  }
  const id = idStr;
  if (games.find(g => g.id === id)) {
    alert('Ce jeu est déjà dans la liste.');
    return;
  }
  const name = await fetchGameName(id) || null;
  games.push({ id, name });
  saveGames();
  renderGames();
  gameIdInput.value = '';
  if (usernameInput.value.trim()) {
    loadAllBadges(usernameInput.value.trim());
  }
};

// Charge les badges pour tous les jeux
async function loadAllBadges(username) {
  results.innerHTML = '';
  for (const game of games) {
    await loadBadgesForGame(username, game);
  }
}

// Charge les badges d’un jeu pour un utilisateur
async function loadBadgesForGame(username, game) {
  const userId = await fetchUserId(username);
  if (!userId) {
    results.innerHTML = `<div class="alert alert-danger">Utilisateur introuvable</div>`;
    return;
  }
  // Fetch badges obtenus par l'utilisateur
  const userBadges = await fetchUserBadges(userId);
  if (!userBadges) {
    results.innerHTML = `<div class="alert alert-warning">Impossible de récupérer les badges de l'utilisateur.</div>`;
    return;
  }

  // Fetch badges du jeu
  const gameBadges = await fetchGameBadges(game.id);
  if (!gameBadges) {
    results.innerHTML += `<div class="alert alert-warning">Impossible de récupérer les badges du jeu ${game.name || game.id}.</div>`;
    return;
  }

  // Croisement badges obtenus / badges du jeu
  const badgesWithStatus = gameBadges.map(badge => {
    const obtainedBadge = userBadges.find(b => b.badgeId === badge.id);
    return {
      ...badge,
      obtained: !!obtainedBadge,
      obtainedDate: obtainedBadge ? obtainedBadge.awardedAt : null
    };
  });

  // Affichage
  renderGameBadges(game, badgesWithStatus);
}

// Récupérer l’ID utilisateur Roblox à partir du pseudo
async function fetchUserId(username) {
  try {
    const res = await fetch(`https://api.roblox.com/users/get-by-username?username=${encodeURIComponent(username)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.Id || null;
  } catch {
    return null;
  }
}

// Récupérer les badges obtenus par un utilisateur
async function fetchUserBadges(userId) {
  try {
    const res = await fetch(`https://badges.roblox.com/v1/users/${userId}/badges`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || [];
  } catch {
    return null;
  }
}

// Récupérer les badges d’un jeu
async function fetchGameBadges(gameId) {
  try {
    const res = await fetch(`https://badges.roblox.com/v1/universes/${gameId}/badges`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || [];
  } catch {
    return null;
  }
}

// Affiche les badges d’un jeu
function renderGameBadges(game, badges) {
  const gameDiv = document.createElement('div');
  gameDiv.className = 'mb-4';

  const obtainedCount = badges.filter(b => b.obtained).length;
  const totalCount = badges.length;
  const progressPercent = totalCount ? Math.round((obtainedCount / totalCount) * 100) : 0;

  const title = document.createElement('h3');
  title.textContent = `${game.name || 'Jeu #' + game.id} — ${obtainedCount} / ${totalCount} badges obtenus`;
  gameDiv.appendChild(title);

  // Progress bar
  const progressWrapper = document.createElement('div');
  progressWrapper.className = 'progress mb-3';
  const progressBar = document.createElement('div');
  progressBar.className = 'progress-bar';
  progressBar.style.width = progressPercent + '%';
  progressBar.setAttribute('aria-valuenow', progressPercent);
  progressBar.setAttribute('aria-valuemin', '0');
  progressBar.setAttribute('aria-valuemax', '100');
  progressBar.textContent = progressPercent + '%';
  progressWrapper.appendChild(progressBar);
  gameDiv.appendChild(progressWrapper);

  // Badges list
  badges.forEach(badge => {
    const card = document.createElement('div');
    card.className = 'card badge-card';

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body d-flex align-items-center';

    const img = document.createElement('img');
    img.src = badge.imageUrl;
    img.alt = badge.name;
    img.width = 60;
    img.height = 60;
    img.className = 'me-3';

    const info = document.createElement('div');
    info.style.flex = '1';

    const name = document.createElement('h5');
    name.textContent = badge.name;

    const desc = document.createElement('p');
    desc.textContent = badge.description || 'Pas de description.';

    const status = document.createElement('p');
    status.innerHTML = badge.obtained
      ? `<span class="text-success">Obtenu</span> - Le ${new Date(badge.obtainedDate).toLocaleDateString()}`
      : `<span class="text-muted">Non obtenu</span>`;

    info.appendChild(name);
    info.appendChild(desc);
    info.appendChild(status);

    cardBody.appendChild(img);
    cardBody.appendChild(info);
    card.appendChild(cardBody);
    gameDiv.appendChild(card);
  });

  results.appendChild(gameDiv);
}

// Event quand l’utilisateur change le pseudo
usernameInput.addEventListener('change', () => {
  results.innerHTML = '';
  const username = usernameInput.value.trim();
  if (username && games.length > 0) {
    loadAllBadges(username);
  }
});

// Initialisation affichage jeux
renderGames();