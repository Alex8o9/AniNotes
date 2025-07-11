const socket = io();

const loginBox = document.querySelector('.login');
const signUpBox = document.querySelector('.signup');
const notesBox = document.querySelector('#notesBox');

const rusername = document.querySelector('#ruser');
const rpassword = document.querySelector('#rpass');
const username = document.querySelector('#user');
const password = document.querySelector('#pass');

let currentUser = null;

function createAcc() {
  signUpBox.classList.remove('hidden');
  loginBox.classList.add('hidden');
}

function goBackToLogin() {
  signUpBox.classList.add('hidden');
  loginBox.classList.remove('hidden');
}

function isValidInput(str) {
  return str.trim().length > 0;
}

function login() {
  const user = username.value.trim();
  const pass = password.value.trim();

  if (!isValidInput(user) || !isValidInput(pass)) {
    alert("Username and password required");
    return;
  }

  socket.emit('login', { user, pass });
  username.value = '';
  password.value = '';
}

function signUp() {
  const ruser = rusername.value.trim();
  const rpass = rpassword.value.trim();

  if (!isValidInput(ruser) || !isValidInput(rpass)) {
    alert("Username and password required");
    return;
  }

  socket.emit('signUp', { ruser, rpass });
  rusername.value = '';
  rpassword.value = '';
}

function saveNote() {
  const note = document.getElementById('noteInput').value.trim();
  if (!note) return alert("Note cannot be empty");
  socket.emit('saveNote', { username: currentUser, note });
  document.getElementById('noteInput').value = '';
}

function getNotes() {
  socket.emit('getNotes', currentUser);
}

socket.on('loginResponse', ({ success, message, user }) => {
  alert(message);
  if (success) {
    currentUser = user;
    loginBox.classList.add('hidden');
    notesBox.classList.remove('hidden');
    getNotes();
  }
});

socket.on('signUpResponse', ({ success, message }) => {
  alert(message);
  if (success) {
    goBackToLogin();
  }
});

socket.on('noteResponse', ({ success, message, notes }) => {
  if (!success) return alert(message || "Note error");

  const list = document.getElementById('noteList');
  list.innerHTML = '';

  notes.forEach(note => {
    const li = document.createElement('li');
    li.textContent = note;

    const btn = document.createElement('button');
    btn.textContent = '❌';
    btn.style.marginLeft = '10px';
    btn.onclick = () => {
      socket.emit('deleteNote', { username: currentUser, note });
    };

    li.appendChild(btn);
    list.appendChild(li);
  });
});
function deleteAccount() {
  if (!currentUser) return;
  const confirmDelete = confirm("Are you sure you want to delete your account?");
  if (confirmDelete) {
    socket.emit('deleteAccount', currentUser);
  }
}

function clearAllNotes() {
  if (!currentUser) return;
  const confirmClear = confirm("Clear all your notes?");
  if (confirmClear) {
    socket.emit('clearNotes', currentUser);
  }
}

socket.on('accountDeleted', ({ success, message }) => {
  alert(message);
  if (success) {
    location.reload();
  }
});
