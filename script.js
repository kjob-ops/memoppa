import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithCredential, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAj5Y7PLvRLRRl8Ay1JMUWjJsbgCAqygG0",
  authDomain: "pepper-c6683.firebaseapp.com",
  projectId: "pepper-c6683",
  storageBucket: "pepper-c6683.firebasestorage.app",
  messagingSenderId: "884448331927",
  appId: "1:884448331927:web:a6fae223e0a1a08a2e41d2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
const GAS_URL = "https://script.google.com/macros/s/AKfycbz1CeAOVkrXfkAueQGWN-MxoReujyCJ7YOlk1Ssr0uyt5X4BWiHgP01COD4fgyrm6JN/exec";

// ==========================================
// 状態管理
// ==========================================
let memos = [];
let currentUser = null;
let currentMemoId = null;
let currentFilter = 'all'; 
let currentSortIndex = 0; 
let currentSearch = '';
let saveTimeout = null;
let isMasked = false; 
let isSidebarPinned = false; 
let isEventsSetup = false; 

let multiSelectMode = false;
let selectedMemos = new Set();

let currentTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
let currentFontFamily = 'system';
let currentFontSize = '16px';
let targetEmail = ''; 

const sortOptions = [
    { id: 'updated-desc', label: '更新日が新しい順' },
    { id: 'updated-asc', label: '更新日が古い順' },
    { id: 'usecount-desc', label: '使用頻度が高い順' },
    { id: 'title-asc', label: 'タイトル（あ→ん / A→Z）' }
];

// ==========================================
// DOM 要素の取得
// ==========================================
const loginScreen = document.getElementById('loginScreen');
const appContainer = document.getElementById('appContainer');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');

const menuBtn = document.getElementById('menuBtn'); 
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const pinSidebarBtn = document.getElementById('pinSidebarBtn'); 
const maskToggleButton = document.getElementById('maskToggleButton'); 
const newMemoBtn = document.getElementById('newMemoBtn');

const mainPinBtn = document.getElementById('mainPinBtn');
const mainPromptBtn = document.getElementById('mainPromptBtn');
const promptFilterBtn = document.getElementById('promptFilterBtn');
const promptVarModal = document.getElementById('promptVarModal');
const promptVarFields = document.getElementById('promptVarFields');
const promptVarPreview = document.getElementById('promptVarPreview');
const promptVarCopyBtn = document.getElementById('promptVarCopyBtn');
const closePromptVarBtn = document.getElementById('closePromptVarBtn');
const mainPrivateBtn = document.getElementById('mainPrivateBtn');
const mainMailBtn = document.getElementById('mainMailBtn'); 
const mainCopyBtn = document.getElementById('mainCopyBtn'); 
const mainDeleteBtn = document.getElementById('mainDeleteBtn');

const mobileNewMemoFab = document.getElementById('mobileNewMemoFab');
const backToListBtn = document.getElementById('backToListBtn');
const mobileMailBtn = document.getElementById('mobileMailBtn');
const mobileCopyBtn = document.getElementById('mobileCopyBtn');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileActionMenu = document.getElementById('mobileActionMenu');
const actionPinBtn = document.getElementById('actionPinBtn');
const actionPrivateBtn = document.getElementById('actionPrivateBtn');
const actionDeleteBtn = document.getElementById('actionDeleteBtn');

const normalControls = document.getElementById('normalControls');
const multiSelectControls = document.getElementById('multiSelectControls');

const cancelMultiSelectBtn = document.getElementById('cancelMultiSelectBtn');
const selectedCountText = document.getElementById('selectedCountText');
const multiSelectAllBtn = document.getElementById('multiSelectAllBtn');
const multiPinBtn = document.getElementById('multiPinBtn');
const multiArchiveBtn = document.getElementById('multiArchiveBtn');
const multiTrashBtn = document.getElementById('multiTrashBtn');
const multiPrivateBtn = document.getElementById('multiPrivateBtn');
const multiCopyBtn = document.getElementById('multiCopyBtn');

const searchInput = document.getElementById('searchInput'); 
const allBtn = document.getElementById('allBtn');
const archiveBtn = document.getElementById('archiveBtn');
const trashBtn = document.getElementById('trashBtn'); 
const sortBtn = document.getElementById('sortBtn'); 
const searchClearBtn = document.getElementById('searchClearBtn');
const memoList = document.getElementById('memoList');

const privateLockOverlay = document.getElementById('privateLockOverlay');
const editorContainer = document.getElementById('editorContainer');

const memoTitle = document.getElementById('memoTitle');
const memoContent = document.getElementById('memoContent');
const memoUpdatedAt = document.getElementById('memoUpdatedAt');
const memoTagsContainer = document.getElementById('memoTagsContainer'); 
const sidebarTagsContainer = document.getElementById('sidebarTagsContainer'); 
const charCount = document.getElementById('charCount'); 

const settingsBtn = document.getElementById('settingsBtn'); 
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const themeLightBtn = document.getElementById('themeLightBtn');
const themeDarkBtn = document.getElementById('themeDarkBtn');
const fontFamilySelect = document.getElementById('fontFamilySelect');
const fontSizeBtns = document.querySelectorAll('.font-size-btn');
const targetEmailInput = document.getElementById('targetEmailInput');
const saveEmailBtn = document.getElementById('saveEmailBtn'); 

const exportAiBtn = document.getElementById('exportAiBtn'); 
const exportDataBtn = document.getElementById('exportDataBtn');
const importDataBtn = document.getElementById('importDataBtn');

const toastContainer = document.getElementById('toastContainer');
const currentUserEmailDisplay = document.getElementById('currentUserEmailDisplay');
const shareLinkBtn = document.getElementById('shareLinkBtn');

// ==========================================
// トースト通知機能
// ==========================================
function showToast(message, icon = 'info') {
    if(!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="material-symbols-rounded">${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    
    setTimeout(() => { toast.classList.add('show'); }, 10);
    setTimeout(() => { 
        toast.classList.remove('show'); 
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==========================================
// 認証 & 初期化
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user; 
        loginScreen?.classList.add('hidden'); 
        appContainer?.classList.remove('hidden');
        
        if(currentUserEmailDisplay) currentUserEmailDisplay.textContent = currentUser.email;

        if (!isEventsSetup) {
            const lastLoginStr = window.localStorage.getItem('pepperLastLogin');
            let welcomeMsg = `ログインしました。`;
            if (lastLoginStr) {
                const d = new Date(parseInt(lastLoginStr));
                welcomeMsg = `おかえりなさい！<br><span style="font-size:11px; font-weight:normal; opacity:0.8;">前回ログイン: ${d.toLocaleDateString()} ${d.toLocaleTimeString()}</span>`;
            }
            showToast(welcomeMsg, 'check_circle');
            window.localStorage.setItem('pepperLastLogin', Date.now().toString());
        }

        loadUserSettings(); 
        initRealtimeMemos();
        if (!isEventsSetup) { setupEventListeners(); isEventsSetup = true; }
    } else {
        currentUser = null; 
        loginScreen?.classList.remove('hidden'); 
        appContainer?.classList.add('hidden');
    }
});

// 拡張機能用: Google OAuthクライアントID（Google Cloud Console → 認証情報 → Webクライアント）
// ※ このIDのリダイレクトURIに https://<拡張ID>.chromiumapp.org/ を追加しておくこと
const GOOGLE_OAUTH_CLIENT_ID = "884448331927-l8qur6hvn1h4hghtdrkulsr3mufn8bna.apps.googleusercontent.com";

function isExtensionEnv() {
    return typeof chrome !== 'undefined' && !!(chrome.identity && chrome.identity.launchWebAuthFlow);
}

async function signInWithChromeIdentity() {
    const redirectUri = chrome.identity.getRedirectURL();
    const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
        + '?client_id=' + encodeURIComponent(GOOGLE_OAUTH_CLIENT_ID)
        + '&response_type=token'
        + '&redirect_uri=' + encodeURIComponent(redirectUri)
        + '&scope=' + encodeURIComponent('openid email profile');
    const responseUrl = await new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (respUrl) => {
            if (chrome.runtime.lastError || !respUrl) reject(new Error(chrome.runtime.lastError ? chrome.runtime.lastError.message : 'auth-cancelled'));
            else resolve(respUrl);
        });
    });
    const params = new URLSearchParams(new URL(responseUrl).hash.slice(1));
    const accessToken = params.get('access_token');
    if (!accessToken) throw new Error('no-access-token');
    const credential = GoogleAuthProvider.credential(null, accessToken);
    await signInWithCredential(auth, credential);
}

// アプリ内ブラウザ（Instagram/LINE/Facebook等）ではGoogleログインがブロックされるため検出して案内
function detectInAppBrowser() {
    const ua = navigator.userAgent || '';
    return /Instagram|Line\/|FBAN|FBAV|FB_IAB|Twitter|TikTok|MicroMessenger/i.test(ua);
}
if (detectInAppBrowser()) {
    const warning = document.getElementById('webviewWarning');
    const loginBtnEl = document.getElementById('googleLoginBtn');
    if (warning) warning.classList.remove('hidden');
    if (loginBtnEl) { loginBtnEl.disabled = true; loginBtnEl.style.opacity = '0.4'; loginBtnEl.style.cursor = 'not-allowed'; }
    const copyBtn = document.getElementById('webviewCopyUrlBtn');
    if (copyBtn) copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(location.href).then(() => { copyBtn.textContent = 'コピーしました！'; setTimeout(() => copyBtn.textContent = 'URLをコピー', 2000); });
    });
}

googleLoginBtn?.addEventListener('click', async () => {
    const originalText = googleLoginBtn.innerHTML; googleLoginBtn.innerHTML = "🔄 Logging in...";
    if (isExtensionEnv()) {
        // Chrome拡張: launchWebAuthFlow方式（MV3ではsignInWithPopupが通らないため）
        if (GOOGLE_OAUTH_CLIENT_ID.includes('XXXX')) {
            alert('拡張機能でのログインには、OAuthクライアントIDの設定が必要です。\nGoogle Cloud Console → APIとサービス → 認証情報 のWebクライアントIDをコードに設定してください。');
            googleLoginBtn.innerHTML = originalText; return;
        }
        try { await signInWithChromeIdentity(); }
        catch (error) {
            console.error('[memoppa] identity sign-in error:', error.message);
            alert(`ログインに失敗しました (${error.message})`);
            googleLoginBtn.innerHTML = originalText;
        }
        return;
    }
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error('[memoppa] sign-in error:', error.code, error.message);
        // ポップアップがブロックされる環境ではリダイレクト方式に切替
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request' || error.code === 'auth/operation-not-supported-in-this-environment') {
            try { await signInWithRedirect(auth, provider); return; }
            catch (e2) { console.error('[memoppa] redirect sign-in error:', e2.code, e2.message); alert(`ログインに失敗しました (${e2.code})`); }
        } else if (error.code === 'auth/unauthorized-domain') {
            alert('ログインに失敗しました: このドメインはFirebaseで承認されていません。\nFirebase Console → Authentication → Settings → 承認済みドメイン に追加してください。');
        } else {
            alert(`ログインに失敗しました (${error.code})`);
        }
        googleLoginBtn.innerHTML = originalText;
    }
});

// リダイレクト方式で戻ってきた場合の結果処理
getRedirectResult(auth).catch((error) => { if(error && error.code) console.error('[memoppa] redirect result error:', error.code, error.message); });
logoutBtn?.addEventListener('click', () => { if(confirm("Sign out from memoppa?")) { signOut(auth); if(settingsModal) settingsModal.style.display = 'none'; } });

// ==========================================
// DB読み込み
// ==========================================
let unsubscribeMemos = null;
// ゴミ箱のメモは10日経過で自動削除（サーバー不要・クライアント側チェック）
const TRASH_RETENTION_DAYS = 10;
function purgeExpiredTrash() {
    const now = Date.now();
    memos.filter(m => m.isTrashed).forEach(m => {
        const trashedAt = new Date(m.trashedAt || m.updatedAt).getTime();
        if (now - trashedAt > TRASH_RETENTION_DAYS * 86400000) {
            cloudDeleteMemo(m.id);
        }
    });
}

function initRealtimeMemos() {
    if (unsubscribeMemos) unsubscribeMemos();
    const memosRef = collection(db, "users", currentUser.uid, "memos");
    unsubscribeMemos = onSnapshot(memosRef, (snapshot) => {
        memos = [];
        snapshot.forEach((doc) => { memos.push({ id: doc.id, ...doc.data() }); });
        purgeExpiredTrash();
        
        // オンボーディングは loadUserSettings の hasSeenOnboarding フラグで表示される
        if (!currentMemoId || !memos.some(m => m.id === currentMemoId)) {
            const firstActive = memos.find(m => !m.archived && !m.isTrashed);
            if(firstActive) selectMemo(firstActive.id, false);
        } else {
            const current = memos.find(m => m.id === currentMemoId);
            if (current && document.activeElement !== memoContent && document.activeElement !== memoTitle) {
                if(memoTitle) memoTitle.value = current.title; 
                if(memoContent) memoContent.innerHTML = current.content;
                updateEditorTagsDisplay(); updateCharCount();
            }
        }
        updateSidebarTags(); renderMemoList();
    });
}

function extractTags(text) {
    if (!text) return [];
    const plainText = text.replace(/<[^>]*>/g, ' ');
    const hashTags = plainText.match(/#([^\s#\[\]]+)/g) || [];
    const bracketTags = plainText.match(/\[([^\]]+)\]/g) || [];
    const cleanedTags = new Set([...hashTags.map(t => t.substring(1).trim()), ...bracketTags.map(t => t.slice(1, -1).trim())]);
    return Array.from(cleanedTags).filter(t => t.length > 0);
}

function updateEditorTagsDisplay() {
    if(!memoTagsContainer || !memoContent) return;
    const tags = extractTags(memoContent.innerText || '');
    memoTagsContainer.innerHTML = '';
    tags.forEach(tag => {
        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.innerHTML = `<span class="material-symbols-rounded">tag</span><span class="tag-chip-label">${escapeHtml(tag)}</span><button class="tag-remove-btn" title="タグを解除（本文は残ります）"><span class="material-symbols-rounded">close</span></button>`;
        chip.addEventListener('click', () => {
            setSearch(tag);
            updateSidebarTags(); renderMemoList();
            if(!isSidebarPinned && window.innerWidth > 768) toggleSidebar(true);
            if(window.innerWidth <= 768) showMobileList();
        });
        chip.querySelector('.tag-remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            untagFromCurrentMemo(tag);
        });
        memoTagsContainer.appendChild(chip);
    });
}

// 本文中の「#タグ」の # だけを外してタグ化を解除する（本文テキストは保持）
function untagFromCurrentMemo(tag) {
    const m = memos.find(x => x.id === currentMemoId);
    if (!m || !memoContent) return;
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`([#＃])(${escaped})(?=[\\s#\\[\\]<&]|$)`, 'g');
    memoContent.innerHTML = memoContent.innerHTML.replace(re, '$2');
    m.content = memoContent.innerHTML;
    m.updatedAt = new Date().toISOString();
    cloudSaveMemo(m);
    updateEditorTagsDisplay(); updateSidebarTags(); renderMemoList();
    showToast('タグを解除しました（本文は残っています）', 'tag');
}

function setSearch(value) {
    currentSearch = value.toLowerCase();
    if(searchInput) searchInput.value = value;
    if(searchClearBtn) searchClearBtn.classList.toggle('hidden', !value);
}

function updateSidebarTags() {
    if(!sidebarTagsContainer) return;
    const allTags = new Set();
    memos.forEach(m => { if (!m.isTrashed && !m.isPrivate) { extractTags(m.content).forEach(t => allTags.add(t)); } });
    sidebarTagsContainer.innerHTML = '';
    Array.from(allTags).sort().forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'sidebar-tag-chip'; btn.textContent = `#${tag}`;
        if (currentSearch === tag.toLowerCase()) btn.classList.add('active');
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (currentSearch === tag.toLowerCase()) { setSearch(''); } 
            else { setSearch(tag); }
            updateSidebarTags(); renderMemoList();
            sidebarTagsContainer.classList.remove('show');
        });
        sidebarTagsContainer.appendChild(btn);
    });
}

function toggleSidebar(forceClose = false) {
    if(!sidebar) return;
    if (forceClose || sidebar.classList.contains('open')) {
        sidebar.classList.remove('open'); if(sidebarOverlay) sidebarOverlay.classList.remove('show'); document.body.classList.remove('sidebar-open');
    } else {
        sidebar.classList.add('open'); if(sidebarOverlay) sidebarOverlay.classList.add('show'); document.body.classList.add('sidebar-open');
    }
}
function showMobileEditor() { appContainer?.classList.add('sp-view-editor'); }
function showMobileList() { appContainer?.classList.remove('sp-view-editor'); }

function toggleMultiSelect(id) {
    if (!multiSelectMode) { 
        multiSelectMode = true; 
        normalControls?.classList.add('hidden'); 
        multiSelectControls?.classList.remove('hidden'); 
        if(mobileNewMemoFab) mobileNewMemoFab.style.display = 'none'; 
        if(navigator.vibrate) navigator.vibrate(50);
    }
    if (selectedMemos.has(id)) selectedMemos.delete(id); else selectedMemos.add(id);
    
    if (selectedMemos.size === 0) exitMultiSelect(); 
    else { 
        if(selectedCountText) selectedCountText.textContent = `${selectedMemos.size} Selected`; 
        renderMemoList(); 
    }
}

function exitMultiSelect() { 
    multiSelectMode = false; 
    selectedMemos.clear(); 
    normalControls?.classList.remove('hidden'); 
    multiSelectControls?.classList.add('hidden'); 
    if(mobileNewMemoFab) mobileNewMemoFab.style.display = 'flex'; 
    
    renderMemoList(); 
}

async function handleMultiAction(action) {
    const promises = [];
    selectedMemos.forEach(id => {
        const memo = memos.find(m => m.id === id);
        if (memo) {
            if (action === 'pin') memo.isPinned = !memo.isPinned;
            if (action === 'archive') memo.archived = !memo.archived;
            if (action === 'trash') { memo.isTrashed = true; memo.isPinned = false; }
            if (action === 'restore') { memo.isTrashed = false; }
            if (action === 'private') { memo.isPrivate = !memo.isPrivate; }
            promises.push(cloudSaveMemo(memo));
        }
    });
    await Promise.all(promises); 
    showToast(`一括操作を完了しました`, 'done_all');
    exitMultiSelect();
}

function bulkTrashOrRestore() {
    if(currentFilter === 'trash') {
        if(confirm('選択したメモを完全に削除しますか？\n(OK: 削除 / キャンセル: 復元)')) {
            selectedMemos.forEach(id => cloudDeleteMemo(id));
            exitMultiSelect();
            showToast('メモを完全に削除しました', 'delete_forever');
        } else {
            handleMultiAction('restore');
        }
    } else {
        handleMultiAction('trash');
    }
}

async function bulkMailSend(btnElement) {
    if (!targetEmailInput || !targetEmailInput.value) { alert('Settingsで転送先メールアドレスを登録してください'); return; }
    const originalHtml = btnElement.innerHTML; 
    btnElement.innerHTML = '<span class="material-symbols-rounded" style="animation: spin 2s linear infinite;">hourglass_empty</span>';
    
    let combinedBody = '';
    selectedMemos.forEach(id => {
        const m = memos.find(x => x.id === id);
        if(m) combinedBody += `【${m.title || '無題のメモ'}】\n${m.content.replace(/<[^>]*>/g, '')}\n\n`;
    });

    try {
        const formData = new URLSearchParams(); 
        formData.append('to', targetEmailInput.value); 
        formData.append('subject', `[memoppa] ${selectedMemos.size} Notes Export`); 
        formData.append('body', combinedBody);
        await fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: formData });
        btnElement.innerHTML = '<span class="material-symbols-rounded">check_circle</span>'; 
        showToast('メールを送信しました！', 'send');
        setTimeout(() => { btnElement.innerHTML = originalHtml; exitMultiSelect(); }, 2000);
    } catch (error) { showToast('送信に失敗しました', 'error'); btnElement.innerHTML = originalHtml; }
}

function setupEventListeners() {
    initCmdPalette();
    const qpBar = document.getElementById('quickPromptBar');
    if (qpBar) qpBar.addEventListener('wheel', (e) => { if (e.deltaY !== 0) { e.preventDefault(); qpBar.scrollLeft += e.deltaY; } }, { passive: false });
    const onboardingStartBtn = document.getElementById('onboardingStartBtn');
    if(onboardingStartBtn) onboardingStartBtn.addEventListener('click', closeOnboarding);
    const reopenOnboardingBtn = document.getElementById('reopenOnboardingBtn');
    if(reopenOnboardingBtn) reopenOnboardingBtn.addEventListener('click', () => { const sm = document.getElementById('settingsModal'); if(sm){ sm.classList.add('hidden'); sm.style.display='none'; } showOnboarding(); });
    if (menuBtn) menuBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleSidebar(); });
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', () => toggleSidebar(true));
    if (pinSidebarBtn) pinSidebarBtn.addEventListener('click', () => {
        isSidebarPinned = !isSidebarPinned; saveUserSettings({ isSidebarPinned });
        document.body.classList.toggle('sidebar-pinned', isSidebarPinned); pinSidebarBtn.classList.toggle('active', isSidebarPinned);
        if(isSidebarPinned) toggleSidebar(true);
    });
    
    if(newMemoBtn) newMemoBtn.addEventListener('click', () => { createNewMemo(); if(!isSidebarPinned) toggleSidebar(true); });
    if(mobileNewMemoFab) mobileNewMemoFab.addEventListener('click', () => { createNewMemo(); showMobileEditor(); });
    if(backToListBtn) backToListBtn.addEventListener('click', () => { updateCurrentMemo(); showMobileList(); });

    if(mainPinBtn) mainPinBtn.addEventListener('click', () => togglePin());
    if(mainPromptBtn) mainPromptBtn.addEventListener('click', () => togglePromptFlag());
    if(promptFilterBtn) promptFilterBtn.addEventListener('click', () => setFilter('prompt'));
    if(closePromptVarBtn) closePromptVarBtn.addEventListener('click', closePromptVarModal);
    if(promptVarModal) promptVarModal.addEventListener('click', (e) => { if(e.target === promptVarModal) closePromptVarModal(); });
    if(promptVarCopyBtn) promptVarCopyBtn.addEventListener('click', () => {
        const id = promptVarModal.dataset.memoId;
        const m = memos.find(x => x.id === id);
        const values = {};
        promptVarFields.querySelectorAll('.prompt-var-input').forEach(inp => { if(inp.value) values[inp.dataset.name] = inp.value; });
        saveVarValues(id, values);
        if(m) finishPromptCopy(m, promptVarModal.dataset.result || '', promptVarModal.dataset.aiDest || null);
        closePromptVarModal();
    });
    if(mainPrivateBtn) mainPrivateBtn.addEventListener('click', () => togglePrivate());
    if(mainDeleteBtn) mainDeleteBtn.addEventListener('click', () => directDelete(currentMemoId));

    if(cancelMultiSelectBtn) cancelMultiSelectBtn.addEventListener('click', exitMultiSelect);
    if(multiPinBtn) multiPinBtn.addEventListener('click', () => handleMultiAction('pin'));
    if(multiArchiveBtn) multiArchiveBtn.addEventListener('click', () => handleMultiAction('archive'));
    if(multiTrashBtn) multiTrashBtn.addEventListener('click', bulkTrashOrRestore);
    if(multiPrivateBtn) multiPrivateBtn.addEventListener('click', () => handleMultiAction('private'));
    if(multiCopyBtn) multiCopyBtn.addEventListener('click', () => {
        let combinedText = '';
        selectedMemos.forEach(id => { const m = memos.find(x => x.id === id); if(m) combinedText += `${m.title || '無題のメモ'}\n${m.content.replace(/<[^>]*>/g, '')}\n\n`; });
        navigator.clipboard.writeText(combinedText).then(() => {
            const originalHtml = multiCopyBtn.innerHTML; multiCopyBtn.innerHTML = '<span class="material-symbols-rounded" style="color:var(--accent-color);">check</span> Copied';
            showToast('メモをコピーしました', 'content_copy');
            setTimeout(() => { multiCopyBtn.innerHTML = originalHtml; exitMultiSelect(); }, 2000);
        });
    });
    if(multiSelectAllBtn) multiSelectAllBtn.addEventListener('click', () => {
        const filtered = getFilteredMemos();
        if (selectedMemos.size === filtered.length) selectedMemos.clear(); else filtered.forEach(m => selectedMemos.add(m.id));
        if (selectedMemos.size === 0) exitMultiSelect(); else { if(selectedCountText) selectedCountText.textContent = `${selectedMemos.size} Selected`; renderMemoList(); }
    });

    if(mobileMenuBtn && mobileActionMenu) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if(mobileActionMenu.style.display === 'none') { mobileActionMenu.style.display = 'flex'; mobileActionMenu.classList.remove('hidden'); } 
            else { mobileActionMenu.style.display = 'none'; mobileActionMenu.classList.add('hidden'); }
            const current = memos.find(m => m.id === currentMemoId);
            if (current) {
                if(actionPinBtn) actionPinBtn.innerHTML = current.isPinned ? `<span class="material-symbols-rounded">push_pin</span> Unpin Note` : `<span class="material-symbols-rounded">push_pin</span> Pin Note`;
                if(actionPrivateBtn) actionPrivateBtn.innerHTML = current.isPrivate ? `<span class="material-symbols-rounded">visibility</span> Make Public` : `<span class="material-symbols-rounded">visibility_off</span> Make Private`;
                if(actionDeleteBtn) actionDeleteBtn.innerHTML = current.isTrashed ? `<span class="material-symbols-rounded">restore_from_trash</span> Restore / Delete` : `<span class="material-symbols-rounded">delete</span> Delete Note`;
            }
        });
        document.addEventListener('click', (e) => { if (mobileActionMenu && !mobileActionMenu.contains(e.target) && e.target !== mobileMenuBtn) { mobileActionMenu.style.display = 'none'; } });
    }

    if(actionPinBtn) actionPinBtn.addEventListener('click', () => { togglePin(); if(mobileActionMenu) mobileActionMenu.style.display = 'none'; });
    const actionPromptBtn = document.getElementById('actionPromptBtn');
    if(actionPromptBtn) actionPromptBtn.addEventListener('click', () => { togglePromptFlag(); if(mobileActionMenu) mobileActionMenu.style.display = 'none'; });
    if(actionPrivateBtn) actionPrivateBtn.addEventListener('click', () => { togglePrivate(); if(mobileActionMenu) mobileActionMenu.style.display = 'none'; });
    if(actionDeleteBtn) actionDeleteBtn.addEventListener('click', () => { directDelete(currentMemoId); if(mobileActionMenu) mobileActionMenu.style.display = 'none'; });

    if(shareLinkBtn) {
        shareLinkBtn.addEventListener('click', () => {
            if(!currentUser) return;
            const refLink = window.location.origin + window.location.pathname + "?ref=" + currentUser.uid;
            navigator.clipboard.writeText(refLink).then(() => {
                showToast('招待リンクをコピーしました！<br>お友達にシェアしてください🚀', 'link');
                const originalHtml = shareLinkBtn.innerHTML;
                shareLinkBtn.innerHTML = `<span class="material-symbols-rounded">check</span> コピー完了！`;
                setTimeout(() => { shareLinkBtn.innerHTML = originalHtml; }, 3000);
            });
        });
    }

    if(privateLockOverlay) {
        privateLockOverlay.addEventListener('click', () => {
            privateLockOverlay.classList.add('hidden');
            if (editorContainer) editorContainer.classList.remove('hidden');
            const memo = memos.find(m => m.id === currentMemoId);
            if(memo && !memo.isTrashed) focusMemoContent();
        });
    }

    const handleCopy = (btnElement) => {
        if(!currentMemoId || !memoContent) return;
        const text = (memoTitle ? memoTitle.value : '') + '\n\n' + (memoContent.innerText || '');
        navigator.clipboard.writeText(text).then(() => {
            if(btnElement) {
                const originalHtml = btnElement.innerHTML; btnElement.innerHTML = '<span class="material-symbols-rounded">check</span>';
                showToast('メモをコピーしました', 'content_copy');
                setTimeout(() => btnElement.innerHTML = originalHtml, 2000);
            }
        });
    };
    if(mainCopyBtn) mainCopyBtn.addEventListener('click', () => handleCopy(mainCopyBtn));
    if(mobileCopyBtn) mobileCopyBtn.addEventListener('click', () => handleCopy(mobileCopyBtn));

    const handleMail = async (btnElement) => {
        if (!targetEmailInput || !targetEmailInput.value) { alert('Settingsで転送先メールアドレスを登録してください'); return; }
        if(!currentMemoId || !memoContent) return;
        const originalHtml = btnElement.innerHTML; btnElement.innerHTML = '<span class="material-symbols-rounded" style="color:var(--text-secondary); animation: spin 2s linear infinite;">hourglass_empty</span>';
        try {
            const formData = new URLSearchParams(); formData.append('to', targetEmailInput.value); formData.append('subject', `[memoppa] ${memoTitle.value || '無題のメモ'}`); formData.append('body', memoContent.innerText || '');
            await fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: formData });
            btnElement.innerHTML = '<span class="material-symbols-rounded" style="color:var(--accent-color);">check_circle</span>'; 
            showToast('メールを送信しました！', 'send');
            setTimeout(() => btnElement.innerHTML = originalHtml, 2500);
        } catch (error) { showToast('送信に失敗しました', 'error'); btnElement.innerHTML = originalHtml; }
    };
    if(mainMailBtn) mainMailBtn.addEventListener('click', () => handleMail(mainMailBtn));
    if(mobileMailBtn) mobileMailBtn.addEventListener('click', () => handleMail(mobileMailBtn));

    if(allBtn) allBtn.addEventListener('click', () => setFilter('all'));
    if(archiveBtn) archiveBtn.addEventListener('click', () => setFilter('archive'));
    if(trashBtn) trashBtn.addEventListener('click', () => setFilter('trash')); 
    
    if(searchInput) searchInput.addEventListener('input', (e) => { currentSearch = e.target.value.toLowerCase(); if(searchClearBtn) searchClearBtn.classList.toggle('hidden', !e.target.value); updateSidebarTags(); renderMemoList(); renderSearchMode(); });
    if(searchClearBtn) searchClearBtn.addEventListener('click', () => { currentSearch = ''; if(searchInput) { searchInput.value = ''; searchInput.focus(); } searchClearBtn.classList.add('hidden'); updateSidebarTags(); renderMemoList(); renderSearchMode(); });
    if(searchInput) searchInput.addEventListener('focus', () => {
        if (window.innerWidth > 768) { enterSearchMode(); }
        else { updateSidebarTags(); sidebarTagsContainer.classList.add('show'); }
    });
    if(searchInput) searchInput.addEventListener('blur', () => { sidebarTagsContainer.classList.remove('show'); });
    const searchModeCloseBtn = document.getElementById('searchModeCloseBtn');
    if(searchModeCloseBtn) searchModeCloseBtn.addEventListener('click', exitSearchMode);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && searchModeActive) exitSearchMode(); });
    if(sortBtn) sortBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('sortMenu');
        if (!menu) return;
        if (!menu.classList.contains('hidden')) { menu.classList.add('hidden'); return; }
        menu.innerHTML = '';
        sortOptions.forEach((opt, i) => {
            const item = document.createElement('button');
            item.className = 'sort-menu-item' + (i === currentSortIndex ? ' active' : '');
            item.innerHTML = `<span>${opt.label}</span>${i === currentSortIndex ? '<span class="material-symbols-rounded">check</span>' : ''}`;
            item.addEventListener('click', () => { currentSortIndex = i; menu.classList.add('hidden'); renderMemoList(); });
            menu.appendChild(item);
        });
        menu.classList.remove('hidden');
    });
    document.addEventListener('click', (e) => { const menu = document.getElementById('sortMenu'); if (menu && !menu.classList.contains('hidden') && !e.target.closest('.sort-dropdown-wrap')) menu.classList.add('hidden'); });

    const triggerSave = () => {
        if (currentMemoId) { 
            updateCharCount(); updateEditorTagsDisplay(); clearTimeout(saveTimeout); 
            saveTimeout = setTimeout(() => { updateCurrentMemo(); updateSidebarTags(); }, 500); 
        }
    };
    if(memoTitle) memoTitle.addEventListener('input', triggerSave);
    if(memoContent) memoContent.addEventListener('input', triggerSave);

    if(maskToggleButton) maskToggleButton.addEventListener('click', () => { isMasked = !isMasked; updateMaskButtonIcon(); document.body.classList.toggle('mask-mode', isMasked); });

    if(settingsBtn) settingsBtn.addEventListener('click', () => { settingsModal.classList.remove('hidden'); settingsModal.style.display = 'flex'; });
    if(closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => { settingsModal.style.display = 'none'; saveAndApplySettings(); });
    if(themeLightBtn) themeLightBtn.addEventListener('click', () => { currentTheme = 'light'; saveAndApplySettings(); });
    if(themeDarkBtn) themeDarkBtn.addEventListener('click', () => { currentTheme = 'dark'; saveAndApplySettings(); });
    if(fontFamilySelect) fontFamilySelect.addEventListener('change', (e) => { currentFontFamily = e.target.value; saveAndApplySettings(); });
    const defaultAiSelect = document.getElementById('defaultAiSelect');
    if(defaultAiSelect) defaultAiSelect.addEventListener('change', (e) => { defaultAi = e.target.value; saveUserSettings({ defaultAi }); showToast(defaultAi ? `宛先AIを${AI_DESTINATIONS[defaultAi].name}に設定しました` : '宛先AIを解除しました', 'bolt'); });
    fontSizeBtns.forEach(btn => btn.addEventListener('click', (e) => { currentFontSize = e.target.dataset.size; saveAndApplySettings(); }));
    
    if(saveEmailBtn) saveEmailBtn.addEventListener('click', () => { targetEmail = targetEmailInput.value; saveUserSettings({ targetEmail }); const o = saveEmailBtn.textContent; saveEmailBtn.textContent = "✔ Registered"; setTimeout(() => saveEmailBtn.textContent = o, 2000); });

    if(exportAiBtn) {
        exportAiBtn.addEventListener('click', () => {
            const filteredMemos = getFilteredMemos();
            if(filteredMemos.length === 0) { showToast("抽出できるメモがありません。", "error"); return; }
            let markdownOutput = `# memoppa AI Knowledge Export\n\nGenerated on: ${new Date().toLocaleString()}\n\n---\n\n`;
            filteredMemos.forEach(m => {
                const title = m.title || "無題のメモ"; const date = new Date(m.updatedAt).toLocaleString();
                const content = m.content.replace(/<br\s*\/?>/mg, "\n").replace(/<[^>]*>/g, "");
                const tags = extractTags(m.content).map(t => `#${t}`).join(' ');
                markdownOutput += `## ${title}\n**Date:** ${date}\n`; if(tags) markdownOutput += `**Tags:** ${tags}\n`; markdownOutput += `\n${content}\n\n---\n\n`;
            });
            const blob = new Blob([markdownOutput], { type: "text/markdown" }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `memoppa_ai_export_${Date.now()}.md`; a.click();
            showToast("Markdownエクスポートが完了しました", "download_done");
        });
    }

    if (exportDataBtn) exportDataBtn.addEventListener('click', () => { const blob = new Blob([JSON.stringify(memos, null, 2)], { type: "application/json" }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `memoppa_backup.json`; a.click(); showToast("バックアップを作成しました", "download_done"); });
}

// ==========================================
// メモの操作
// ==========================================
function createNewMemo() {
    setSearch('');
    setFilter('all'); 
    
    const newId = "memo_" + Date.now();
    const newMemo = { id: newId, title: '', content: '', archived: false, isPinned: false, isPrivate: false, isTrashed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    memos.unshift(newMemo); cloudSaveMemo(newMemo); selectMemo(newId, true);
}

// ==========================================
// オンボーディング: チュートリアル → AI選択 の二段フロー
// ==========================================
let hasSeenOnboardingFlag = false;
let aiSelectShown = false;

// ステップ1: 使い方チュートリアル（#onboardingModal）
function showOnboarding() {
    const modal = document.getElementById('onboardingModal');
    if (modal) modal.classList.remove('hidden');
}
function closeOnboarding() {
    const modal = document.getElementById('onboardingModal');
    if (modal) modal.classList.add('hidden');
    // 初回のみ、続けてAI選択へ
    if (!hasSeenOnboardingFlag) showAiSelect();
}

// ステップ2: 普段使うAIの選択（#aiSelectModal）
function showAiSelect() {
    if (aiSelectShown) return;
    aiSelectShown = true;
    const modal = document.getElementById('aiSelectModal');
    if (!modal) { createWelcomeMemo([]); return; }
    const chips = modal.querySelectorAll('.ai-chip');
    const doneBtn = document.getElementById('onboardingDoneBtn');
    const skipBtn = document.getElementById('onboardingSkipBtn');
    const selected = new Set();

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const ai = chip.dataset.ai;
            if (selected.has(ai)) { selected.delete(ai); chip.classList.remove('selected'); }
            else { selected.add(ai); chip.classList.add('selected'); }
            doneBtn.disabled = selected.size === 0;
        });
    });
    doneBtn.addEventListener('click', () => {
        const ais = Array.from(selected);
        if (ais.length === 1) { defaultAi = ais[0]; saveUserSettings({ defaultAi, hasSeenOnboarding: true }); const sel = document.getElementById('defaultAiSelect'); if(sel) sel.value = defaultAi; }
        else { saveUserSettings({ hasSeenOnboarding: true }); }
        hasSeenOnboardingFlag = true;
        modal.classList.add('hidden');
        if (memos.filter(m => !m.isTrashed).length === 0) createWelcomeMemo(ais);
    });
    skipBtn.addEventListener('click', () => {
        saveUserSettings({ hasSeenOnboarding: true });
        hasSeenOnboardingFlag = true;
        modal.classList.add('hidden');
        if (memos.filter(m => !m.isTrashed).length === 0) createWelcomeMemo([]);
    });
    modal.classList.remove('hidden');
}

function createWelcomeMemo(selectedAis = []) {
    setSearch('');
    setFilter('all'); 

    // 体験用サンプルプロンプト（クイックバー・⚡タブが最初から空にならないように）
    const tagAi = selectedAis.length > 1 ? selectedAis[0] : null;
    const promptId = "memo_" + Date.now();
    const samplePrompt = {
        id: promptId, title: 'サンプル: 文章を要約',
        content: `以下の文章を{{トーン:ですます調|カジュアル|箇条書き}}で、{{文字数}}字以内に要約してください。<br><br>{{本文}}${tagAi ? `<br><br>@${tagAi}` : ''}`,
        archived: false, isPinned: false, isPrivate: false, isTrashed: false, isPrompt: true, useCount: 0,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    memos.unshift(samplePrompt); cloudSaveMemo(samplePrompt);

    // 選択に応じてウェルカムメモの説明を出し分け
    let aiSection;
    if (selectedAis.length === 1) {
        const name = AI_DESTINATIONS[selectedAis[0]].name;
        aiSection = `・<b>2秒で使う</b>: プロンプトのコピーボタンを押すと、自動で<b>${name}</b>が開きます（Ctrl+Vで貼るだけ）。宛先はSettingsでいつでも変更できます。`;
    } else if (selectedAis.length > 1) {
        const names = selectedAis.map(a => `@${a}`).join(' / ');
        aiSection = `・<b>宛先タグ</b>: AIを使い分けるあなたには <code>${names}</code> が便利。メモ本文に書くと、コピー時にそのAIが自動で開きます（左のサンプルにも入っています）。`;
    } else {
        aiSection = `・<b>宛先AI</b>: Settingsで宛先AIを選ぶと、コピーと同時にそのAIが開きます。メモに <code>@claude</code> のように書けばメモごとの指定も可能。`;
    }

    const newId = "memo_" + (Date.now() + 1);
    const content = `memoppa（メモっぱ）へようこそ。<b>新しいタブがAIの作業机になる</b>メモ帳です。<br><br><b>⚡ まず試してほしいこと（30秒）</b><br>・左のリストの「サンプル: 文章を要約」のコピーボタンを押してみてください。変数の穴埋め画面が出ます。<br>・<code>/</code> キーを押すと、どこからでもプロンプトを検索してコピーできます。<br>${aiSection}<br><br><b>📌 基本操作</b><br>・よく使うプロンプトはメモを開いて ⚡ ボタンで登録。使うほど上に並びます。<br>・本文に <code>{{変数名}}</code> と書くと穴埋め式に、<code>{{トーン:A|B}}</code> と書くと選択式になります。<br>・タグ付けは <code>#アイデア</code> のように本文に書くだけ。<br><br><b>💡 便利な機能</b><br>・複数選択（PC: 左端チェックボックス / スマホ: 長押し）から一括メール送信。<br>・SettingsからMarkdown一括エクスポート（AI向け）。<br><br>まずはサンプルをコピーして、2秒の速さを体感してみてください！`;
    
    const newMemo = { 
        id: newId, title: 'ようこそ memoppa へ！🚀', content: content, 
        archived: false, isPinned: true, isPrivate: false, isTrashed: false, 
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() 
    };
    memos.unshift(newMemo); cloudSaveMemo(newMemo); selectMemo(newId, true);
}

function selectMemo(id, openEditorInMobile = true) {
    exitSearchMode();
    currentMemoId = id; const memo = memos.find(m => m.id === id);
    if (memo) {
        if(memoTitle) memoTitle.value = memo.title; if(memoContent) memoContent.innerHTML = memo.content; 
        if(memoUpdatedAt) memoUpdatedAt.textContent = memo.updatedAt ? `最終更新: ${formatDate(memo.updatedAt)}` : '';
        if(memo.isTrashed) { if(memoTitle) memoTitle.readOnly = true; if(memoContent) memoContent.setAttribute('contenteditable', 'false'); } 
        else { if(memoTitle) memoTitle.readOnly = false; if(memoContent) memoContent.setAttribute('contenteditable', 'true'); }
        
        if (memo.isPrivate) {
            privateLockOverlay?.classList.remove('hidden');
            editorContainer?.classList.add('hidden');
        } else {
            privateLockOverlay?.classList.add('hidden');
            editorContainer?.classList.remove('hidden');
        }

        renderMemoList();
        if(openEditorInMobile && window.innerWidth <= 768) showMobileEditor();
        else if(!isSidebarPinned && window.innerWidth > 768) toggleSidebar(true);
        
        if(!memo.isTrashed && !memo.isPrivate) focusMemoContent(); 
        updateEditorTagsDisplay(); updateCharCount();
        updateMainActionButtons(memo);
        renderQuickPromptBar();
    }
}

function updateMainActionButtons(memo) {
    if(mainPinBtn) { mainPinBtn.classList.toggle('active', !!memo.isPinned); }
    if(mainPrivateBtn) { mainPrivateBtn.classList.toggle('active', !!memo.isPrivate); }
    if(mainPromptBtn) { mainPromptBtn.classList.toggle('active-prompt', !!memo.isPrompt); mainPromptBtn.title = memo.isPrompt ? 'プロンプト登録を解除' : 'プロンプトとして登録'; }
}

function updateCurrentMemo() {
    const memo = memos.find(m => m.id === currentMemoId);
    if (memo && !memo.isTrashed) {
        if(memoTitle) memo.title = memoTitle.value; if(memoContent) memo.content = memoContent.innerHTML; 
        memo.updatedAt = new Date().toISOString(); cloudSaveMemo(memo); renderMemoList();
    }
}

function togglePin() { const m = memos.find(x => x.id === currentMemoId); if(m && !m.isTrashed){ m.isPinned = !m.isPinned; m.updatedAt = new Date().toISOString(); cloudSaveMemo(m); renderMemoList(); updateMainActionButtons(m); } }

// ==========================================
// プロンプト庫
// ==========================================
// プロンプトの宛先AI
const AI_DESTINATIONS = {
    claude:  { name: 'Claude',  url: 'https://claude.ai/new' },
    chatgpt: { name: 'ChatGPT', url: 'https://chatgpt.com/' },
    gemini:  { name: 'Gemini',  url: 'https://gemini.google.com/app' },
    grok:    { name: 'Grok',    url: 'https://grok.com/' }
};
let defaultAi = '';

// 本文中の @claude / @chatgpt / @gemini を検出（大文字小文字不問）
function detectAiTag(text) {
    const match = text.match(/(^|\s)@(claude|chatgpt|gemini|grok)\b/i);
    return match ? match[2].toLowerCase() : null;
}

// コピーするテキストから宛先タグを取り除く
function stripAiTags(text) {
    return text.replace(/(^|\s)@(claude|chatgpt|gemini|grok)\b/gi, '$1').replace(/[ \t]+$/gm, '').trim();
}

function togglePromptFlag() {
    const m = memos.find(x => x.id === currentMemoId);
    if(m && !m.isTrashed){
        m.isPrompt = !m.isPrompt;
        // 無題のまま登録された場合、本文1行目からタイトルを自動設定
        if (m.isPrompt && !m.title) {
            const firstLine = getPlainContent(m).split('\n').find(l => l.trim()) || '';
            if (firstLine) {
                m.title = firstLine.trim().slice(0, 30);
                if (currentMemoId === m.id && memoTitle) memoTitle.value = m.title;
            }
        }
        m.updatedAt = new Date().toISOString();
        cloudSaveMemo(m); renderMemoList(); updateMainActionButtons(m);
        showToast(m.isPrompt ? 'プロンプト庫に登録しました ⚡' : 'プロンプト登録を解除しました', 'bolt');
    }
}

// {{名前}} → テキスト入力 / {{名前:選択肢1|選択肢2}} → プルダウン
function extractPromptVars(text) {
    const matches = text.match(/\{\{([^{}]+)\}\}/g) || [];
    const seen = new Set(); const vars = [];
    matches.forEach(token => {
        if (seen.has(token)) return; seen.add(token);
        const inner = token.slice(2, -2).trim();
        const ci = inner.indexOf(':');
        if (ci > -1) {
            const name = inner.slice(0, ci).trim() || inner;
            const options = inner.slice(ci + 1).split('|').map(s => s.trim()).filter(Boolean);
            vars.push({ token, name, options: options.length ? options : null });
        } else {
            vars.push({ token, name: inner, options: null });
        }
    });
    return vars;
}

function getSavedVarValues(memoId) {
    try { return (JSON.parse(localStorage.getItem('memoppa_prompt_vars') || '{}'))[memoId] || {}; } catch(e) { return {}; }
}
function saveVarValues(memoId, values) {
    try {
        const all = JSON.parse(localStorage.getItem('memoppa_prompt_vars') || '{}');
        all[memoId] = values;
        localStorage.setItem('memoppa_prompt_vars', JSON.stringify(all));
    } catch(e) {}
}

function getPlainContent(memo) {
    const div = document.createElement('div');
    div.innerHTML = memo.content.replace(/<div>/gi, '\n').replace(/<br\s*\/?>/gi, '\n');
    return div.innerText || div.textContent || '';
}

function copyPrompt(id) {
    const m = memos.find(x => x.id === id);
    if (!m) return;
    const rawText = getPlainContent(m);
    const aiDest = detectAiTag(rawText) || defaultAi || null;
    const text = stripAiTags(rawText);
    const vars = extractPromptVars(text);
    if (vars.length === 0) { finishPromptCopy(m, text, aiDest); return; }

    const saved = getSavedVarValues(id); // 前回入力した値を初期値に
    promptVarFields.innerHTML = '';
    vars.forEach(v => {
        const row = document.createElement('div');
        row.className = 'prompt-var-row';
        const label = document.createElement('label');
        label.textContent = v.name;
        row.appendChild(label);
        let field;
        if (v.options) {
            field = document.createElement('select');
            field.className = 'settings-select prompt-var-input';
            v.options.forEach(opt => { const o = document.createElement('option'); o.value = opt; o.textContent = opt; field.appendChild(o); });
            if (saved[v.name] && v.options.includes(saved[v.name])) field.value = saved[v.name];
        } else {
            field = document.createElement('input');
            field.type = 'text';
            field.className = 'settings-select prompt-var-input';
            field.placeholder = `${v.name}を入力...`;
            if (saved[v.name]) field.value = saved[v.name];
        }
        field.dataset.token = v.token; field.dataset.name = v.name;
        row.appendChild(field);
        promptVarFields.appendChild(row);
    });

    const updatePreview = () => {
        let result = text;
        promptVarFields.querySelectorAll('.prompt-var-input').forEach(inp => {
            const val = inp.value || inp.dataset.token;
            result = result.split(inp.dataset.token).join(val);
        });
        promptVarPreview.textContent = result.length > 300 ? result.slice(0, 300) + '…' : result;
        promptVarModal.dataset.result = result;
    };
    promptVarFields.querySelectorAll('.prompt-var-input').forEach(inp => { inp.addEventListener('input', updatePreview); inp.addEventListener('change', updatePreview); });
    updatePreview();

    promptVarModal.dataset.memoId = id;
    promptVarModal.dataset.aiDest = aiDest || '';
    promptVarModal.classList.remove('hidden'); promptVarModal.style.display = 'flex';
    const first = promptVarFields.querySelector('input, select'); if(first) first.focus();
}

function finishPromptCopy(m, text, aiDest) {
    navigator.clipboard.writeText(text).then(() => {
        m.useCount = (m.useCount || 0) + 1;
        cloudSaveMemo(m);
        renderMemoList();
        const dest = aiDest && AI_DESTINATIONS[aiDest];
        if (dest) {
            showToast(`コピーしました — ${dest.name}を開きます（Ctrl+Vで貼り付け）`, 'bolt');
            window.open(dest.url, '_blank');
        } else {
            showToast(`コピーしました（${m.useCount}回目）`, 'bolt');
        }
    });
}

function closePromptVarModal() {
    promptVarModal.classList.add('hidden'); promptVarModal.style.display = 'none';
}

// 新規タブを開いた瞬間に使える、よく使うプロンプト上位3件のバー
function renderQuickPromptBar() {
    const bar = document.getElementById('quickPromptBar');
    if (!bar) return;
    const allPrompts = memos.filter(m => m.isPrompt && !m.isTrashed && !m.isPrivate);
    const byUseCount = [...allPrompts].sort((a, b) => (b.useCount || 0) - (a.useCount || 0));

    // 今開いているメモがプロンプト登録済みなら、常に先頭に固定表示
    const openMemo = allPrompts.find(m => m.id === currentMemoId);
    let ordered = byUseCount.filter(m => m.id !== currentMemoId).slice(0, 9);
    if (openMemo) ordered = [openMemo, ...ordered];

    bar.innerHTML = '';
    ordered.forEach(m => {
        const chip = document.createElement('button');
        chip.className = 'qp-chip' + (m.id === currentMemoId ? ' qp-current' : '');
        chip.title = m.id === currentMemoId ? '編集中のプロンプト・クリックでコピー' : 'クリックでコピー';
        chip.innerHTML = `<span class="material-symbols-rounded">bolt</span><span class="qp-title">${escapeHtml(m.title || '無題のプロンプト')}</span>${m.useCount ? `<span class="use-count">${m.useCount}</span>` : ''}`;
        chip.addEventListener('click', () => copyPrompt(m.id));
        bar.appendChild(chip);
    });
}

// ==========================================
// PC検索モード（メモスペースを検索画面として活用）
// ==========================================
let searchModeActive = false;

function enterSearchMode() {
    if (window.innerWidth <= 768) return;
    const view = document.getElementById('searchModeView');
    if (!view) return;
    searchModeActive = true;
    view.classList.remove('hidden');
    document.getElementById('mainContent')?.classList.add('search-mode');
    renderSearchMode();
}

function exitSearchMode() {
    if (!searchModeActive) return;
    searchModeActive = false;
    document.getElementById('searchModeView')?.classList.add('hidden');
    document.getElementById('mainContent')?.classList.remove('search-mode');
}

function renderSearchMode() {
    if (!searchModeActive) return;
    const tagsEl = document.getElementById('searchModeTags');
    const resultsEl = document.getElementById('searchModeResults');
    const labelEl = document.getElementById('searchModeResultLabel');
    if (!tagsEl || !resultsEl) return;

    // タグ一覧（広いスペースで大きく表示）
    const allTags = new Set();
    memos.forEach(m => { if (!m.isTrashed && !m.isPrivate) { extractTags(m.content).forEach(t => allTags.add(t)); } });
    tagsEl.innerHTML = '';
    Array.from(allTags).sort().forEach(tag => {
        const chip = document.createElement('button');
        chip.className = 'sm-tag-chip' + (currentSearch === tag.toLowerCase() ? ' active' : '');
        chip.textContent = `#${tag}`;
        chip.addEventListener('click', () => {
            if (currentSearch === tag.toLowerCase()) { setSearch(''); } else { setSearch(tag); }
            updateSidebarTags(); renderMemoList(); renderSearchMode();
        });
        tagsEl.appendChild(chip);
    });
    if (allTags.size === 0) tagsEl.innerHTML = '<p class="sm-empty">タグはまだありません。メモ本文に #タグ名 と書くと、ここに表示されます。</p>';

    // 検索条件に合致するメモ一覧（カード表示）
    const results = memos.filter(m => !m.isTrashed && !m.isPrivate).filter(m => {
        if (!currentSearch) return true;
        const plainText = m.content.replace(/<[^>]*>/g, '').toLowerCase();
        return (m.title || '').toLowerCase().includes(currentSearch) || plainText.includes(currentSearch);
    }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    if (labelEl) labelEl.textContent = currentSearch ? `「${searchInput ? searchInput.value : currentSearch}」の検索結果（${results.length}件）` : `すべてのメモ（${results.length}件）`;

    resultsEl.innerHTML = '';
    if (results.length === 0) {
        resultsEl.innerHTML = '<p class="sm-empty">該当するメモがありません。</p>';
        return;
    }
    results.forEach(m => {
        const card = document.createElement('div');
        card.className = 'sm-card';
        const preview = m.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90);
        card.innerHTML = `
            <div class="sm-card-title">
                ${m.isPrompt ? '<span class="material-symbols-rounded sm-bolt">bolt</span>' : ''}
                ${m.isPinned ? '<span class="material-symbols-rounded sm-pin">push_pin</span>' : ''}
                <span>${escapeHtml(m.title || '無題のメモ')}</span>
            </div>
            <p class="sm-card-preview">${escapeHtml(preview)}</p>
            <span class="sm-card-date">${formatDate(m.updatedAt)}</span>`;
        card.addEventListener('click', () => { exitSearchMode(); selectMemo(m.id); });
        resultsEl.appendChild(card);
    });
}

// ==========================================
// コマンドパレット（/ キーで起動）
// ==========================================
let cmdSelectedIndex = 0;
let cmdResults = [];

function openCmdPalette() {
    const palette = document.getElementById('cmdPalette');
    const input = document.getElementById('cmdPaletteInput');
    if (!palette || !input) return;
    palette.classList.remove('hidden');
    input.value = '';
    renderCmdResults('');
    setTimeout(() => input.focus(), 0);
}

function closeCmdPalette() {
    const palette = document.getElementById('cmdPalette');
    if (palette) palette.classList.add('hidden');
}

function renderCmdResults(query) {
    const resultsEl = document.getElementById('cmdPaletteResults');
    if (!resultsEl) return;
    const q = query.toLowerCase();
    cmdResults = memos
        .filter(m => m.isPrompt && !m.isTrashed && !m.isPrivate)
        .filter(m => !q || (m.title || '').toLowerCase().includes(q) || getPlainContent(m).toLowerCase().includes(q))
        .sort((a, b) => (b.useCount || 0) - (a.useCount || 0))
        .slice(0, 8);
    cmdSelectedIndex = 0;
    resultsEl.innerHTML = '';
    if (cmdResults.length === 0) {
        resultsEl.innerHTML = `<div class="cmd-empty">${q ? '該当するプロンプトがありません' : 'プロンプト庫が空です。メモを⚡で登録すると、ここから一瞬で呼び出せます'}</div>`;
        return;
    }
    cmdResults.forEach((m, i) => {
        const row = document.createElement('div');
        row.className = 'cmd-result' + (i === 0 ? ' selected' : '');
        const preview = getPlainContent(m).replace(/\n/g, ' ').slice(0, 60);
        row.innerHTML = `<span class="material-symbols-rounded">bolt</span>
            <div class="cmd-result-text"><span class="cmd-result-title">${escapeHtml(m.title || '無題のプロンプト')}</span><span class="cmd-result-preview">${escapeHtml(preview)}</span></div>
            ${m.useCount ? `<span class="use-count">${m.useCount}</span>` : ''}`;
        row.addEventListener('click', () => { closeCmdPalette(); copyPrompt(m.id); });
        row.addEventListener('mouseenter', () => setCmdSelection(i));
        resultsEl.appendChild(row);
    });
}

function setCmdSelection(i) {
    cmdSelectedIndex = i;
    document.querySelectorAll('.cmd-result').forEach((el, j) => el.classList.toggle('selected', j === i));
    const sel = document.querySelectorAll('.cmd-result')[i];
    if (sel) sel.scrollIntoView({ block: 'nearest' });
}

function initCmdPalette() {
    const palette = document.getElementById('cmdPalette');
    const input = document.getElementById('cmdPaletteInput');
    if (!palette || !input) return;

    document.addEventListener('keydown', (e) => {
        const tag = (document.activeElement && document.activeElement.tagName) || '';
        const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement && document.activeElement.isContentEditable);
        if (e.key === '/' && !isEditing && palette.classList.contains('hidden')) {
            e.preventDefault(); openCmdPalette();
        } else if (e.key === 'Escape' && !palette.classList.contains('hidden')) {
            closeCmdPalette();
        }
    });

    input.addEventListener('input', (e) => renderCmdResults(e.target.value));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setCmdSelection(Math.min(cmdSelectedIndex + 1, cmdResults.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setCmdSelection(Math.max(cmdSelectedIndex - 1, 0)); }
        else if (e.key === 'Enter' && cmdResults[cmdSelectedIndex]) {
            e.preventDefault(); const id = cmdResults[cmdSelectedIndex].id;
            closeCmdPalette(); copyPrompt(id);
        }
    });
    palette.addEventListener('click', (e) => { if (e.target === palette) closeCmdPalette(); });
}

function togglePrivate() { 
    const m = memos.find(x => x.id === currentMemoId); 
    if(m && !m.isTrashed){ 
        m.isPrivate = !m.isPrivate; 
        m.updatedAt = new Date().toISOString(); 
        cloudSaveMemo(m); 
        renderMemoList(); 
        selectMemo(m.id, false); 
    } 
}

function directDelete(id) { 
    const m = memos.find(x => x.id === id); 
    if (m) { 
        if (m.isTrashed) { 
            if (confirm('メモを完全に削除しますか？')) {
                cloudDeleteMemo(m.id); 
                if(currentMemoId === m.id) { currentMemoId = null; if(memoTitle) memoTitle.value = ''; if(memoContent) memoContent.innerHTML = ''; if(memoUpdatedAt) memoUpdatedAt.textContent = ''; }
            }
        } else { 
            m.isTrashed = true; m.isPinned = false; m.trashedAt = new Date().toISOString(); cloudSaveMemo(m); 
            showToast('ゴミ箱に移動しました（10日後に自動削除）', 'delete');
        } 
        renderMemoList();
        if(window.innerWidth <= 768 && currentMemoId === null) showMobileList();
    } 
}

// (以下省略せず全コード維持)
function directRestore(id) {
    const m = memos.find(x => x.id === id);
    if (m && m.isTrashed) { m.isTrashed = false; cloudSaveMemo(m); renderMemoList(); showToast('メモを復元しました', 'restore_from_trash'); }
}
function directPin(id) {
    const m = memos.find(x => x.id === id);
    if (m && !m.isTrashed) { m.isPinned = !m.isPinned; cloudSaveMemo(m); renderMemoList(); }
}
function directArchive(id) {
    const m = memos.find(x => x.id === id);
    if (m && !m.isTrashed) { m.archived = !m.archived; cloudSaveMemo(m); renderMemoList(); showToast(m.archived ? 'アーカイブしました' : 'アーカイブから戻しました', 'archive'); }
}
function directPrivate(id) {
    const m = memos.find(x => x.id === id);
    if (m && !m.isTrashed) { m.isPrivate = !m.isPrivate; cloudSaveMemo(m); renderMemoList(); if (currentMemoId === id) selectMemo(id, false); }
}

async function cloudSaveMemo(memo) { if (!currentUser) return; await setDoc(doc(db, "users", currentUser.uid, "memos", memo.id), memo); }
async function cloudDeleteMemo(memoId) { if (!currentUser) return; await deleteDoc(doc(db, "users", currentUser.uid, "memos", memoId)); }

let onboardingChecked = false;

function loadUserSettings() { 
    const prefsRef = doc(db, "users", currentUser.uid, "settings", "preferences");
    onSnapshot(prefsRef, (docSnap) => {
        if (!onboardingChecked) {
            onboardingChecked = true;
            const seen = docSnap.exists() && docSnap.data().hasSeenOnboarding;
            hasSeenOnboardingFlag = !!seen;
            if (!seen) showOnboarding();
        }
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.theme) currentTheme = data.theme; if (data.fontFamily) currentFontFamily = data.fontFamily; if (data.fontSize) currentFontSize = data.fontSize;
            if (data.targetEmail) { targetEmail = data.targetEmail; if(targetEmailInput) targetEmailInput.value = targetEmail; }
            if (typeof data.defaultAi === 'string') { defaultAi = data.defaultAi; const sel = document.getElementById('defaultAiSelect'); if(sel) sel.value = defaultAi; }
            if (data.isSidebarPinned && pinSidebarBtn) { isSidebarPinned = data.isSidebarPinned; document.body.classList.toggle('sidebar-pinned', isSidebarPinned); pinSidebarBtn.classList.toggle('active', isSidebarPinned); }
            applySettings();
        }
    });
}
function saveUserSettings(updates) { if (currentUser) setDoc(doc(db, "users", currentUser.uid, "settings", "preferences"), updates, { merge: true }); }
function saveAndApplySettings() { saveUserSettings({ theme: currentTheme, fontFamily: currentFontFamily, fontSize: currentFontSize }); applySettings(); }
function applySettings() {
    document.body.setAttribute('data-theme', currentTheme);
    let fontStr = currentFontFamily === 'noto-sans' ? "'Noto Sans JP', sans-serif" : "-apple-system, BlinkMacSystemFont, sans-serif"; 
    if(memoContent) memoContent.style.fontFamily = fontStr; if(memoTitle) memoTitle.style.fontFamily = fontStr; if(memoContent) memoContent.style.fontSize = currentFontSize;
}
function updateMaskButtonIcon() { if(maskToggleButton) maskToggleButton.innerHTML = isMasked ? `🙈` : `<span class="material-symbols-rounded">visibility</span>`; maskToggleButton.classList.toggle('active', isMasked); }
function focusMemoContent() { if(memoContent) setTimeout(() => { memoContent.focus(); updateCharCount(); }, 100); }
function updateCharCount() { if(charCount && memoContent) { const text = memoContent.innerText || ''; charCount.textContent = `${text.replace(/[\n\r]/g, '').length} chars`; } }

function setFilter(filter) {
    currentFilter = filter;
    if(allBtn) allBtn.classList.toggle('active', filter === 'all');
    if(promptFilterBtn) promptFilterBtn.classList.toggle('active', filter === 'prompt');
    if(archiveBtn) archiveBtn.classList.toggle('active', filter === 'archive');
    if(trashBtn) trashBtn.classList.toggle('active', filter === 'trash');
    exitMultiSelect(); showMobileList(); renderMemoList();
}

function getFilteredMemos() {
    let filtered = memos;
    if (currentFilter === 'all') filtered = filtered.filter(m => !m.archived && !m.isTrashed);
    else if (currentFilter === 'prompt') filtered = filtered.filter(m => m.isPrompt && !m.isTrashed);
    else if (currentFilter === 'archive') filtered = filtered.filter(m => m.archived && !m.isTrashed);
    else if (currentFilter === 'trash') filtered = filtered.filter(m => m.isTrashed);

    if (currentSearch) {
        filtered = filtered.filter(m => {
            const plainText = m.content.replace(/<[^>]*>/g, '').toLowerCase();
            return m.title.toLowerCase().includes(currentSearch) || plainText.includes(currentSearch);
        });
    }
    const sortType = sortOptions[currentSortIndex].id;
    return filtered.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1; if (!a.isPinned && b.isPinned) return 1;  
        if (currentFilter === 'prompt') { const diff = (b.useCount || 0) - (a.useCount || 0); if (diff !== 0) return diff; }
        if (sortType === 'updated-desc') return new Date(b.updatedAt) - new Date(a.updatedAt);
        if (sortType === 'usecount-desc') return (b.useCount || 0) - (a.useCount || 0);
        if (sortType === 'updated-asc') return new Date(a.updatedAt) - new Date(b.updatedAt);
        if (sortType === 'title-asc') return (a.title || '無題のメモ').localeCompare(b.title || '無題のメモ', 'ja');
        return 0;
    });
}

function formatDate(isoString) {
    const d = new Date(isoString); const today = new Date();
    if (d.toDateString() === today.toDateString()) { return d.toLocaleTimeString('ja-JP', {hour: '2-digit', minute:'2-digit'}); }
    return `${d.getMonth()+1}月${d.getDate()}日`;
}

function renderMemoList() {
    if(!memoList) return;
    renderQuickPromptBar();
    memoList.innerHTML = '';
    const filteredMemos = getFilteredMemos();
    if (currentFilter === 'prompt' && filteredMemos.length === 0 && !currentSearch) {
        memoList.innerHTML = `<div class="prompt-empty-state">
            <span class="material-symbols-rounded">bolt</span>
            <p>プロンプト庫は空です</p>
            <p class="hint">メモを開いて ⚡ ボタンを押すと登録できます。<br>本文に {{変数名}} と書くと、コピー時に穴埋めできます。<br>{{トーン:カジュアル|フォーマル}} と書けば選択式になります。<br>登録後は <kbd>/</kbd> キーでどこからでも呼び出せます。</p>
        </div>`;
        return;
    }
    filteredMemos.forEach(memo => {
        const isSelected = selectedMemos.has(memo.id);
        const swipeContainer = document.createElement('div');
        swipeContainer.className = 'swipe-container';
        swipeContainer.innerHTML = `<div class="swipe-bg"><span class="material-symbols-rounded">archive</span><span class="material-symbols-rounded">archive</span></div>`;

        const item = document.createElement('div');
        item.className = `memo-item ${memo.id === currentMemoId && !multiSelectMode ? 'active' : ''} ${memo.isPinned ? 'pinned' : ''} ${memo.isTrashed ? 'trashed' : ''} ${isSelected ? 'selected' : ''} ${multiSelectMode ? 'multi-select-active' : ''}`;
        item.dataset.id = memo.id;

        let titleText = memo.title ? memo.title : '無題のメモ';
        const isUntitled = !memo.title;
        let preview = memo.content.replace(/<[^>]*>/g, '').substring(0, 40) || 'Empty';
        if (memo.isPrivate) { titleText = `🔒 Secret`; preview = 'Classified document...'; }

        const tags = extractTags(memo.content);
        let tagsHtml = '';
        if (tags.length > 0 && !memo.isPrivate) {
            const displayTags = tags.slice(0, 3);
            const extraCount = tags.length - 3;
            const chipsHtml = displayTags.map(t => `<span class="list-tag-chip">#${escapeHtml(t)}</span>`).join('');
            const moreHtml = extraCount > 0 ? `<span class="list-tag-more">+${extraCount}</span>` : '';
            tagsHtml = `<div class="list-tags-container">${chipsHtml}${moreHtml}</div>`;
        }

        const isTrashed = memo.isTrashed;
        let promptCopyHtml = '';
        if (memo.isPrompt && !isTrashed && !memo.isPrivate) {
            const dest = detectAiTag(getPlainContent(memo)) || defaultAi || null;
            const destLabel = dest && AI_DESTINATIONS[dest] ? `コピーして${AI_DESTINATIONS[dest].name}を開く` : 'プロンプトをコピー';
            promptCopyHtml = `<button class="list-action-btn prompt-copy-btn" data-id="${memo.id}" title="${destLabel}"><span class="material-symbols-rounded">bolt</span>${memo.useCount ? `<span class="use-count">${memo.useCount}</span>` : ''}</button>`;
        }
        let actionHtml;
        if (isTrashed) {
            const daysLeft = Math.max(0, 10 - Math.floor((Date.now() - new Date(memo.trashedAt || memo.updatedAt).getTime()) / 86400000));
            actionHtml = `
            <div class="list-actions trash-actions">
                <span class="trash-countdown" title="ゴミ箱のメモは自動的に完全削除されます">あと${daysLeft}日で自動削除</span>
                <button class="list-action-btn labeled-btn restore-btn" data-id="${memo.id}"><span class="material-symbols-rounded">restore_from_trash</span>復元</button>
                <button class="list-action-btn labeled-btn danger delete-forever-btn" data-id="${memo.id}"><span class="material-symbols-rounded">delete_forever</span>完全に削除</button>
            </div>`;
        } else if (currentFilter === 'archive' && memo.archived) {
            actionHtml = `
            <div class="list-actions">
                ${promptCopyHtml}
                <button class="list-action-btn pin-btn ${memo.isPinned ? 'is-pinned' : ''}" data-id="${memo.id}" title="Pin"><span class="material-symbols-rounded">push_pin</span></button>
                <button class="list-action-btn unarchive-btn" data-id="${memo.id}" title="元に戻す"><span class="material-symbols-rounded">unarchive</span></button>
                <button class="list-action-btn trash-btn" data-id="${memo.id}" title="Delete"><span class="material-symbols-rounded">delete</span></button>
            </div>`;
        } else {
            actionHtml = `
            <div class="list-actions">
                ${promptCopyHtml}
                <button class="list-action-btn pin-btn ${memo.isPinned ? 'is-pinned' : ''}" data-id="${memo.id}" title="Pin"><span class="material-symbols-rounded">push_pin</span></button>
                <button class="list-action-btn archive-btn" data-id="${memo.id}" title="Archive"><span class="material-symbols-rounded">archive</span></button>
                <button class="list-action-btn trash-btn" data-id="${memo.id}" title="Delete"><span class="material-symbols-rounded">delete</span></button>
            </div>`;
        }

        item.innerHTML = `
            <div class="item-meta-col">
                <div class="checkbox-wrapper">
                    <input type="checkbox" class="custom-checkbox list-checkbox" data-id="${memo.id}" ${isSelected ? 'checked' : ''}>
                </div>
                <div class="drag-handle"><span class="material-symbols-rounded">drag_indicator</span></div>
            </div>
            <div class="memo-text-content">
                <div class="memo-item-header">
                    <div class="memo-item-title-wrap">
                        ${memo.isPinned ? '<span class="material-symbols-rounded pin-indicator">push_pin</span>' : ''}
                        ${memo.isPrompt && !memo.isPrivate ? '<span class="material-symbols-rounded prompt-indicator">bolt</span>' : ''}
                        <span class="memo-item-title ${isUntitled ? 'untitled' : ''}">${escapeHtml(titleText)}</span>
                    </div>
                </div>
                <div class="memo-item-preview">${escapeHtml(preview)}</div>
                <div class="memo-item-footer">
                    ${tagsHtml}
                    ${actionHtml}
                </div>
            </div>
        `;

        item.querySelectorAll('.list-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                const id = btn.dataset.id;
                if(btn.classList.contains('prompt-copy-btn')) copyPrompt(id);
                if(btn.classList.contains('private-btn')) directPrivate(id);
                if(btn.classList.contains('pin-btn')) directPin(id);
                if(btn.classList.contains('archive-btn')) directArchive(id);
                if(btn.classList.contains('unarchive-btn')) directArchive(id);
                if(btn.classList.contains('trash-btn')) directDelete(id);
                if(btn.classList.contains('restore-btn')) directRestore(id);
                if(btn.classList.contains('delete-forever-btn')) directDelete(id);
            });
        });

        const checkbox = item.querySelector('.list-checkbox');
        checkbox?.addEventListener('click', (e) => { e.stopPropagation(); toggleMultiSelect(memo.id); });

        let pressTimer;
        let touchStartX = 0, touchStartY = 0;
        const startPress = (e) => {
            if (e.target.closest('.drag-handle') || e.target.closest('.list-actions') || e.target.closest('.checkbox-wrapper')) return;
            if (e.touches) { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; }
            pressTimer = setTimeout(() => { toggleMultiSelect(memo.id); }, 500);
        };
        const cancelPress = (e) => {
            if (e.type === 'touchmove' && e.touches) {
                const moveX = Math.abs(e.touches[0].clientX - touchStartX);
                const moveY = Math.abs(e.touches[0].clientY - touchStartY);
                if (moveX < 10 && moveY < 10) return; 
            }
            clearTimeout(pressTimer);
        };
        item.addEventListener('touchstart', startPress, {passive: true});
        item.addEventListener('touchend', cancelPress);
        item.addEventListener('touchmove', cancelPress, {passive: true});
        item.addEventListener('mousedown', startPress);
        item.addEventListener('mouseup', cancelPress);
        item.addEventListener('mouseleave', cancelPress);

        let isSwiping = false, swipeStartX = 0, swipeStartY = 0, currentX = 0;
        item.addEventListener('touchstart', e => {
            if (multiSelectMode || memo.isTrashed || e.target.closest('.drag-handle') || e.target.closest('.list-actions') || e.target.closest('.checkbox-wrapper')) return;
            swipeStartX = e.touches ? e.touches[0].clientX : e.clientX;
            swipeStartY = e.touches ? e.touches[0].clientY : e.clientY;
            isSwiping = true; item.style.transition = 'none';
        }, {passive: true});

        item.addEventListener('touchmove', e => {
            if (!isSwiping) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const diffX = clientX - swipeStartX;
            const diffY = clientY - swipeStartY;
            if (Math.abs(diffY) > Math.abs(diffX)) { isSwiping = false; item.style.transform = `translateX(0)`; return; }
            if(e.cancelable) e.preventDefault(); 
            currentX = diffX;
            item.style.transform = `translateX(${currentX}px)`;
            const bg = swipeContainer.querySelector('.swipe-bg');
            if (bg) bg.style.opacity = Math.min(Math.abs(currentX) / 80, 1);
        }, {passive: false});

        item.addEventListener('touchend', () => {
            if (!isSwiping) return;
            isSwiping = false; item.style.transition = 'transform 0.2s ease-out';
            if (Math.abs(currentX) > window.innerWidth * 0.3) {
                item.style.transform = `translateX(${currentX > 0 ? 100 : -100}%)`;
                setTimeout(() => { memo.archived = !memo.archived; cloudSaveMemo(memo); renderMemoList(); showToast(memo.archived ? 'アーカイブしました' : 'アーカイブから戻しました', 'archive'); }, 200);
            } else { item.style.transform = `translateX(0)`; }
            currentX = 0;
        });

        item.addEventListener('click', (e) => {
            if (e.target.closest('.drag-handle') || e.target.closest('.list-actions') || e.target.closest('.checkbox-wrapper')) return; 
            if (multiSelectMode) { toggleMultiSelect(memo.id); } else { selectMemo(memo.id, true); }
        });

        const dragHandle = item.querySelector('.drag-handle');
        if (!memo.isTrashed && dragHandle) {
            dragHandle.addEventListener('touchstart', (e) => { if(e.cancelable) e.preventDefault(); draggedItem = item; item.classList.add('sortable-ghost'); }, {passive: false});
            dragHandle.addEventListener('touchmove', (e) => {
                if(e.cancelable) e.preventDefault();
                const touch = e.touches[0];
                const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
                const targetContainer = targetElement ? targetElement.closest('.swipe-container') : null;
                if (targetContainer && targetContainer !== swipeContainer) {
                    memoList.querySelectorAll('.memo-item').forEach(el => { el.style.borderTop = ''; el.style.borderBottom = ''; });
                    const bounding = targetContainer.getBoundingClientRect();
                    const isAfter = (touch.clientY - (bounding.y + bounding.height / 2) > 0);
                    const targetItem = targetContainer.querySelector('.memo-item');
                    if (targetItem) { if (isAfter) targetItem.style.borderBottom = '2px solid var(--accent-color)'; else targetItem.style.borderTop = '2px solid var(--accent-color)'; }
                }
            }, {passive: false});

            dragHandle.addEventListener('touchend', (e) => {
                item.classList.remove('sortable-ghost');
                const touch = e.changedTouches[0];
                const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
                const targetContainer = targetElement ? targetElement.closest('.swipe-container') : null;
                memoList.querySelectorAll('.memo-item').forEach(el => { el.style.borderTop = ''; el.style.borderBottom = ''; });
                if (targetContainer && targetContainer !== swipeContainer) {
                    const targetId = targetContainer.querySelector('.memo-item').dataset.id;
                    const targetMemo = memos.find(m => m.id === targetId);
                    const draggedMemo = memos.find(m => m.id === memo.id);
                    if (targetMemo && draggedMemo) {
                        const bounding = targetContainer.getBoundingClientRect();
                        const isAfter = (touch.clientY - (bounding.y + bounding.height / 2) > 0);
                        draggedMemo.updatedAt = new Date(new Date(targetMemo.updatedAt).getTime() + (isAfter ? -1000 : 1000)).toISOString();
                        cloudSaveMemo(draggedMemo); renderMemoList();
                    }
                }
            });

            const enableDrag = () => item.setAttribute('draggable', true);
            const disableDrag = () => item.setAttribute('draggable', false);
            dragHandle.addEventListener('mousedown', enableDrag);
            dragHandle.addEventListener('mouseup', disableDrag);
            dragHandle.addEventListener('mouseleave', disableDrag);

            item.addEventListener('dragstart', function(e) { draggedItem = this; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', memo.id); setTimeout(() => this.classList.add('sortable-ghost'), 0); });
            item.addEventListener('dragover', function(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; const bounding = this.getBoundingClientRect(); if (e.clientY - (bounding.y + bounding.height / 2) > 0) { this.style.borderBottom = '2px solid var(--accent-color)'; this.style.borderTop = ''; } else { this.style.borderTop = '2px solid var(--accent-color)'; this.style.borderBottom = ''; } });
            item.addEventListener('dragleave', function() { this.style.borderTop = ''; this.style.borderBottom = ''; });
            item.addEventListener('drop', function(e) {
                e.preventDefault(); this.style.borderTop = ''; this.style.borderBottom = '';
                if (draggedItem !== this) {
                    const draggedId = e.dataTransfer.getData('text/plain');
                    const targetMemo = memos.find(m => m.id === memo.id);
                    const draggedMemo = memos.find(m => m.id === draggedId);
                    if(targetMemo && draggedMemo) {
                        const isAfter = (e.clientY - (this.getBoundingClientRect().y + this.getBoundingClientRect().height / 2) > 0);
                        draggedMemo.updatedAt = new Date(new Date(targetMemo.updatedAt).getTime() + (isAfter ? -1000 : 1000)).toISOString();
                        cloudSaveMemo(draggedMemo); renderMemoList();
                    }
                }
            });
            item.addEventListener('dragend', function() { this.classList.remove('sortable-ghost'); disableDrag(); memoList.querySelectorAll('.memo-item').forEach(el => { el.style.borderTop = ''; el.style.borderBottom = ''; }); });
        }
        swipeContainer.appendChild(item);
        memoList.appendChild(swipeContainer);
    });
}
function escapeHtml(text) { return text ? text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : ''; }