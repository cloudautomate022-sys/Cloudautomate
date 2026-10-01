document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_PASSWORD = 'cloudautomate';
  const STORAGE_KEY = 'cloudAutomateTeamState';
  const HISTORY_KEY = 'cloudAutomateTeamHistory';
  const CONTACT_MESSAGES_KEY = 'cloudAutomateContactMessages';
  const MAX_HISTORY_ITEMS = 8;
  const TEAM_API_URL = '/api/team';

  const defaultTeamState = {
    summary:
      'Our team combines security thinking, hands-on technical expertise, and a practical approach to digital growth. We work closely with businesses to design resilient systems, streamline operations, and deliver measurable results.',
    photo:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80',
    members: [
      {
        id: 1,
        name: 'Raul Nieves',
        role: 'TSA / IA Engineering',
        photo:
          'https://github.com/cloudautomate022-sys/Cloudautomate/blob/main/Photo/RN2.1.jpg?raw=true',
      },
      {
        id: 2,
        name: 'Mary Mitchell',
        role: 'Sales Representative',
        photo:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
      },
      {
        id: 3,
        name: 'Juan Pablo Sanchez',
        role: 'Security Architect / AI Engineering',
        photo:
          'https://github.com/cloudautomate022-sys/Cloudautomate/blob/main/Photo/JPS2.1.jpeg?raw=true',
      },
    ],
  };

  const year = document.getElementById('year');
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(file);
    });
  }

  function syncPhotoControls() {
    const teamSource = document.querySelector('input[name="teamPhotoSource"]:checked')?.value || 'url';
    const memberSource = document.querySelector('input[name="memberPhotoSource"]:checked')?.value || 'url';

    const teamUrlWrap = document.getElementById('teamPhotoUrlWrap');
    const teamUploadWrap = document.getElementById('teamPhotoUploadWrap');
    const memberUrlWrap = document.getElementById('memberPhotoUrlWrap');
    const memberUploadWrap = document.getElementById('memberPhotoUploadWrap');

    if (teamUrlWrap && teamUploadWrap) {
      teamUrlWrap.classList.toggle('hidden', teamSource !== 'url');
      teamUploadWrap.classList.toggle('hidden', teamSource !== 'upload');
    }

    if (memberUrlWrap && memberUploadWrap) {
      memberUrlWrap.classList.toggle('hidden', memberSource !== 'url');
      memberUploadWrap.classList.toggle('hidden', memberSource !== 'upload');
    }
  }

  const revealItems = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealItems.forEach((item) => observer.observe(item));

  const teamSummaryText = document.getElementById('teamSummaryText');
  const teamCoverPhoto = document.getElementById('teamCoverPhoto');
  const teamGrid = document.getElementById('teamGrid');
  const teamSummaryInput = document.getElementById('teamSummaryInput');
  const teamPhotoInput = document.getElementById('teamPhotoInput');
  const memberList = document.getElementById('memberList');
  const memberFormSubmitButton = document.getElementById('memberFormSubmitButton');
  const memberFormCancelButton = document.getElementById('memberFormCancelButton');
  const adminPasswordModal = document.getElementById('adminPasswordModal');
  const adminPasswordInput = document.getElementById('adminPasswordInput');
  const adminError = document.getElementById('adminError');
  const teamAdminPanel = document.getElementById('teamAdminPanel');
  const adminToggleButtons = document.querySelectorAll('[data-admin-toggle]');
  const closeAdminButtons = document.querySelectorAll('[data-close-admin]');

  async function getStoredState() {
    try {
      const response = await fetch(TEAM_API_URL);
      if (response.ok) {
        const parsed = await response.json();
        if (parsed && Array.isArray(parsed.members)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          return parsed;
        }
      }
    } catch (error) {
      // fallback to localStorage below
    }

    try {
      const storedState = localStorage.getItem(STORAGE_KEY);
      if (storedState) {
        const parsed = JSON.parse(storedState);
        return {
          summary: parsed.summary || defaultTeamState.summary,
          photo: parsed.photo || defaultTeamState.photo,
          members: Array.isArray(parsed.members) && parsed.members.length ? parsed.members : defaultTeamState.members,
        };
      }
    } catch (error) {
      // ignore and use defaults
    }

    return structuredClone(defaultTeamState);
  }

  async function saveTeamState(nextState) {
    const serialized = JSON.stringify(nextState);

    try {
      const response = await fetch(TEAM_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: serialized,
      });

      if (!response.ok) {
        console.error('Failed to persist team state on server');
        localStorage.setItem(STORAGE_KEY, serialized);
        return;
      }

      const data = await response.json();
      const savedTeam = data && data.team ? data.team : nextState;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedTeam));
      return savedTeam;
    } catch (error) {
      console.error('Team persistence failed on server:', error);
      localStorage.setItem(STORAGE_KEY, serialized);
    }
  }

  async function persistTeamState(nextState, options = {}) {
    const { saveHistory = true } = options;

    await saveTeamState(nextState);
    if (saveHistory) {
      saveHistorySnapshot();
    }
    renderTeam();
  }

  function getHistory() {
    try {
      const storedHistory = localStorage.getItem(HISTORY_KEY);
      if (!storedHistory) {
        return [];
      }

      const parsed = JSON.parse(storedHistory);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  async function saveHistorySnapshot() {
    const state = await getStoredState();
    const history = getHistory();

    const snapshot = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      summary: state.summary,
      photo: state.photo,
      members: state.members,
    };

    const nextHistory = [snapshot, ...history].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    renderHistory();
  }

  function escapeHtml(value = '') {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getContactMessages() {
    try {
      const storedMessages = localStorage.getItem(CONTACT_MESSAGES_KEY);
      if (!storedMessages) {
        return [];
      }

      const parsed = JSON.parse(storedMessages);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveContactMessages(messages) {
    localStorage.setItem(CONTACT_MESSAGES_KEY, JSON.stringify(messages));
    renderContactMessages();
  }

  function renderContactMessages() {
    const contactMessagesList = document.getElementById('contactMessagesList');
    if (!contactMessagesList) {
      return;
    }

    const messages = getContactMessages();
    if (!messages.length) {
      contactMessagesList.innerHTML = '<li class="member-empty">No customer messages yet.</li>';
      return;
    }

    contactMessagesList.innerHTML = messages
      .map(
        (message) => `
          <li class="member-item history-item message-item">
            <div class="member-content">
              <h4>${escapeHtml(message.name || 'Unknown')} - ${escapeHtml(message.company || 'No company')}</h4>
              <p>${escapeHtml(message.email || 'No email')}</p>
              <p>${escapeHtml(message.createdAt || new Date().toLocaleString())}</p>
              <p>${escapeHtml(message.message || 'No message provided')}</p>
            </div>
            <button type="button" class="button button-secondary member-delete" data-message-id="${message.id}">Delete</button>
          </li>
        `
      )
      .join('');

    contactMessagesList.querySelectorAll('[data-message-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const nextMessages = getContactMessages().filter((item) => item.id !== Number(button.dataset.messageId));
        saveContactMessages(nextMessages);
      });
    });
  }

  function exportContactMessages(filename = 'download.txt') {
    const messages = getContactMessages();
    const header = 'Cloud Automate Contact Messages\n';
    const body = messages.length
      ? messages
          .map(
            (message) =>
              `Date: ${message.createdAt || new Date().toLocaleString()}\nName: ${message.name || 'Unknown'}\nEmail: ${message.email || 'No email'}\nCompany: ${message.company || 'No company'}\nMessage: ${message.message || 'No message provided'}\n---`
          )
          .join('\n')
      : 'No customer messages yet.';

    const blob = new Blob([header + body], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function renderHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList) {
      return;
    }

    const history = getHistory();
    if (!history.length) {
      historyList.innerHTML = '<li class="member-empty">No previous versions saved yet.</li>';
      return;
    }

    historyList.innerHTML = history
      .map(
        (entry) => `
          <li class="member-item history-item">
            <img src="${entry.photo || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80'}" alt="Saved team snapshot" />
            <div class="member-content">
              <h4>${entry.timestamp}</h4>
              <p>${entry.members.length} member${entry.members.length === 1 ? '' : 's'}</p>
            </div>
            <button type="button" class="button button-secondary member-delete" data-history-id="${entry.id}">Restore</button>
          </li>
        `
      )
      .join('');

    historyList.querySelectorAll('[data-history-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        const snapshot = getHistory().find((entry) => entry.id === Number(button.dataset.historyId));
        if (!snapshot) {
          return;
        }

        await persistTeamState({
          summary: snapshot.summary,
          photo: snapshot.photo,
          members: snapshot.members,
        });
      });
    });
  }

  let editingMemberId = null;

  function resetMemberForm() {
    editingMemberId = null;

    const nameInput = document.getElementById('memberNameInput');
    const roleInput = document.getElementById('memberRoleInput');
    const photoInput = document.getElementById('memberPhotoInput');
    const sourceRadios = document.querySelectorAll('input[name="memberPhotoSource"]');

    if (nameInput) nameInput.value = '';
    if (roleInput) roleInput.value = '';
    if (photoInput) photoInput.value = '';
    sourceRadios.forEach((radio) => {
      if (radio.value === 'url') {
        radio.checked = true;
      }
    });
    syncPhotoControls();

    if (memberFormSubmitButton) {
      memberFormSubmitButton.textContent = 'Add member';
    }

    if (memberFormCancelButton) {
      memberFormCancelButton.classList.add('hidden');
    }
  }

  function startEditingMember(member) {
    const nameInput = document.getElementById('memberNameInput');
    const roleInput = document.getElementById('memberRoleInput');
    const photoInput = document.getElementById('memberPhotoInput');

    if (!member || !nameInput || !roleInput || !photoInput) {
      return;
    }

    editingMemberId = member.id;
    nameInput.value = member.name || '';
    roleInput.value = member.role || '';
    photoInput.value = member.photo || '';

    if (memberFormSubmitButton) {
      memberFormSubmitButton.textContent = 'Update member';
    }

    if (memberFormCancelButton) {
      memberFormCancelButton.classList.remove('hidden');
    }

    window.scrollTo({ top: document.body.scrollHeight * 0.25, behavior: 'smooth' });
  }

  function renderMembers(members) {
    if (!memberList) {
      return;
    }

    if (!members.length) {
      memberList.innerHTML = '<li class="member-empty">No members yet.</li>';
      return;
    }

    memberList.innerHTML = members
      .map(
        (member) => `
          <li class="member-item">
            <img src="${member.photo || 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80'}" alt="${member.name}" />
            <div class="member-content">
              <h4>${member.name}</h4>
              <p>${member.role}</p>
            </div>
            <div class="member-actions">
              <button type="button" class="button button-secondary member-edit" data-member-id="${member.id}">Edit</button>
              <button type="button" class="button button-secondary member-delete" data-member-id="${member.id}">Remove</button>
            </div>
          </li>
        `
      )
      .join('');

    memberList.querySelectorAll('.member-edit').forEach((button) => {
      button.addEventListener('click', async () => {
        const selectedMember = (await getStoredState()).members.find((member) => member.id === Number(button.dataset.memberId));
        if (selectedMember) {
          startEditingMember(selectedMember);
        }
      });
    });

    memberList.querySelectorAll('.member-delete').forEach((button) => {
      button.addEventListener('click', async () => {
        const nextState = await getStoredState();
        nextState.members = nextState.members.filter((member) => member.id !== Number(button.dataset.memberId));
        await persistTeamState(nextState);
      });
    });
  }

  async function renderTeam() {
    const state = await getStoredState();

    if (teamSummaryText) {
      teamSummaryText.textContent = state.summary;
    }

    if (teamCoverPhoto) {
      teamCoverPhoto.src = state.photo;
      teamCoverPhoto.alt = 'Cloud Automate team';
    }

    if (teamSummaryInput) {
      teamSummaryInput.value = state.summary;
    }

    if (teamPhotoInput) {
      teamPhotoInput.value = state.photo;
    }

    if (memberList) {
      renderMembers(state.members);
    }

    if (teamGrid) {
      teamGrid.innerHTML = state.members
        .map(
          (member) => `
            <div class="team-member reveal" style="opacity:1; transform:none;">
              <img src="${member.photo || 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80'}" alt="${member.name}" />
              <div class="member-copy">
                <h3>${member.name}</h3>
                <p>${member.role}</p>
              </div>
            </div>
          `
        )
        .join('');
      teamGrid.style.display = 'grid';
      teamGrid.style.opacity = '1';
      teamGrid.style.visibility = 'visible';
    }
  }

  function toggleAdminModal(show) {
    if (!adminPasswordModal) {
      return;
    }

    adminPasswordModal.classList.toggle('hidden', !show);
    adminPasswordModal.setAttribute('aria-hidden', String(!show));

    if (show) {
      adminPasswordInput.value = '';
      adminError.textContent = '';
      setTimeout(() => adminPasswordInput.focus(), 50);
    }
  }

  function unlockAdmin() {
    const password = adminPasswordInput.value.trim();
    if (password === ADMIN_PASSWORD) {
      toggleAdminModal(false);

      if (window.location.pathname.toLowerCase().endsWith('/admin.html')) {
        if (teamAdminPanel) {
          teamAdminPanel.classList.remove('hidden');
          teamAdminPanel.style.display = 'block';
        }
        return;
      }

      window.location.href = 'admin.html';
      return;
    }

    adminError.textContent = 'Incorrect password. Please try again.';
  }

  function lockAdmin() {
    if (teamAdminPanel) {
      teamAdminPanel.classList.add('hidden');
      teamAdminPanel.style.display = 'none';
    }
    if (teamGrid) {
      teamGrid.style.display = 'grid';
    }
    adminPasswordInput.value = '';
    adminError.textContent = '';
  }

  if (teamAdminPanel) {
    teamAdminPanel.classList.add('hidden');
    teamAdminPanel.style.display = 'none';
  }

  if (teamGrid) {
    teamGrid.style.display = 'grid';
  }

  const form = document.querySelector('.contact-form');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const timestamp = new Date().toLocaleString();
      const message = {
        id: Date.now(),
        name: String(formData.get('name') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        company: String(formData.get('company') || '').trim(),
        message: String(formData.get('message') || '').trim(),
        createdAt: timestamp,
      };

      if (!message.name || !message.email || !message.message) {
        return;
      }

      const messages = getContactMessages();
      const nextMessages = [message, ...messages].slice(0, 50);
      saveContactMessages(nextMessages);
      exportContactMessages('download.txt');

      const button = form.querySelector('button[type="submit"]');
      const originalText = button.textContent;
      button.textContent = 'Request Sent';
      button.disabled = true;
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
        form.reset();
      }, 2200);
    });
  }

  adminToggleButtons.forEach((button) => {
    button.addEventListener('click', () => toggleAdminModal(true));
  });

  closeAdminButtons.forEach((button) => {
    button.addEventListener('click', () => toggleAdminModal(false));
  });

  document.getElementById('adminUnlockButton')?.addEventListener('click', unlockAdmin);
  document.getElementById('adminLogoutButton')?.addEventListener('click', lockAdmin);
  document.getElementById('downloadContactMessages')?.addEventListener('click', exportContactMessages);
  adminPasswordInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      unlockAdmin();
    }
  });

  document.querySelectorAll('input[name="teamPhotoSource"]').forEach((radio) => {
    radio.addEventListener('change', syncPhotoControls);
  });

  document.querySelectorAll('input[name="memberPhotoSource"]').forEach((radio) => {
    radio.addEventListener('change', syncPhotoControls);
  });

  document.getElementById('teamSettingsForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const nextState = await getStoredState();
    const source = document.querySelector('input[name="teamPhotoSource"]:checked')?.value || 'url';
    const file = document.getElementById('teamPhotoUpload')?.files?.[0];

    nextState.summary = teamSummaryInput.value.trim() || defaultTeamState.summary;
    try {
      if (source === 'upload') {
        nextState.photo = await fileToDataUrl(file);
      } else {
        nextState.photo = teamPhotoInput.value.trim() || defaultTeamState.photo;
      }
    } catch (error) {
      nextState.photo = defaultTeamState.photo;
    }

    await persistTeamState(nextState);
  });

  document.getElementById('memberForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const nameInput = document.getElementById('memberNameInput');
    const roleInput = document.getElementById('memberRoleInput');
    const photoInput = document.getElementById('memberPhotoInput');
    const source = document.querySelector('input[name="memberPhotoSource"]:checked')?.value || 'url';
    const file = document.getElementById('memberPhotoUpload')?.files?.[0];

    const name = nameInput.value.trim();
    const role = roleInput.value.trim();

    if (!name || !role) {
      return;
    }

    let photo = photoInput.value.trim();
    try {
      if (source === 'upload') {
        photo = await fileToDataUrl(file);
      }
    } catch (error) {
      photo = 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80';
    }

    const nextState = await getStoredState();
    const fallbackPhoto = 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80';

    if (editingMemberId) {
      const memberIndex = nextState.members.findIndex((member) => member.id === editingMemberId);
      if (memberIndex >= 0) {
        nextState.members[memberIndex] = {
          ...nextState.members[memberIndex],
          name,
          role,
          photo: photo || nextState.members[memberIndex].photo || fallbackPhoto,
        };
      }
    } else {
      nextState.members.push({
        id: Date.now(),
        name,
        role,
        photo: photo || fallbackPhoto,
      });
    }

    await persistTeamState(nextState);
    resetMemberForm();
  });

  memberFormCancelButton?.addEventListener('click', resetMemberForm);

  document.querySelectorAll('.member-delete').forEach((button) => {
    button.addEventListener('click', async () => {
      const nextState = await getStoredState();
      nextState.members = nextState.members.filter((member) => member.id !== Number(button.dataset.memberId));
      await persistTeamState(nextState);
    });
  });

  syncPhotoControls();
  renderHistory();
  renderContactMessages();
  renderTeam();
});
