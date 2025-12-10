// wallet.js - version adaptée pour Polygon & token DZD
// Assumes ethers.js is available as window.ethers (via script tag in index.html)

const TOKEN_ADDRESS = "0x07221c2D1dc1D5485Bf069871E2820864B4948F7";
const RPC = "https://polygon-rpc.com";
const TOKEN_SYMBOL = "DZD";
const TOKEN_DECIMALS = 18;

// LocalStorage keys (renamed from FRN -> DZD)
const STORAGE_KEY_PRIVATE = "dzd_private_key";   // encrypted or raw (your choice)
const STORAGE_KEY_PIN = "dzd_pin";

// Global objects
let provider, wallet, signer, tokenContract;

window.addEventListener("load", async () => {
  // Init provider
  provider = new ethers.providers.JsonRpcProvider(RPC);

  // Setup UI depending on whether a PIN / private key exists
  const pin = localStorage.getItem(STORAGE_KEY_PIN);
  const pk = localStorage.getItem(STORAGE_KEY_PRIVATE);

  if (pin && pk) {
    document.getElementById("pinLoginBox").style.display = "block";
  } else {
    document.getElementById("pinSetupBox").style.display = "block";
  }

  // Attach UI handlers
  attachHandlers();
});

function attachHandlers() {
  document.getElementById("setupPinBtn")?.addEventListener("click", setupPinAndGenerate);
  document.getElementById("loginPinBtn")?.addEventListener("click", loginWithPin);
  document.getElementById("generateBtn")?.addEventListener("click", generateNewWallet);
  document.getElementById("restoreBtn")?.addEventListener("click", restoreFromPrivateKey);
  document.getElementById("sendBtn")?.addEventListener("click", sendToken);
  document.getElementById("refreshBalanceBtn")?.addEventListener("click", refreshBalance);
  // Add any other button bindings you have in your index.html
}

async function setupPinAndGenerate() {
  const pin = document.getElementById("pinInput")?.value;
  if (!pin || pin.length < 4) { alert("Choisissez un PIN d'au moins 4 chiffres"); return; }

  // Generate new wallet (ethers random)
  const newWallet = ethers.Wallet.createRandom();
  // WARNING: saving raw private key in localStorage is not secure; consider encryption/key derivation
  localStorage.setItem(STORAGE_KEY_PRIVATE, newWallet.privateKey);
  localStorage.setItem(STORAGE_KEY_PIN, pin);

  await loadWalletFromPrivateKey(newWallet.privateKey);
  alert("Portefeuille créé et PIN enregistré. Sauvegardez votre clé privée en lieu sûr !");
  showMainUI();
}

async function generateNewWallet() {
  const newWallet = ethers.Wallet.createRandom();
  localStorage.setItem(STORAGE_KEY_PRIVATE, newWallet.privateKey);
  // do not set pin here - let user set it explicitly via setupPinAndGenerate if desired
  await loadWalletFromPrivateKey(newWallet.privateKey);
  showMainUI();
}

async function restoreFromPrivateKey() {
  const raw = document.getElementById("privKeyInput")?.value;
  if (!raw || !raw.startsWith("0x") || raw.length < 50) { alert("Clé privée invalide"); return; }
  localStorage.setItem(STORAGE_KEY_PRIVATE, raw);
  await loadWalletFromPrivateKey(raw);
  alert("Clé privée restaurée.");
  showMainUI();
}

async function loginWithPin() {
  const pin = document.getElementById("pinLoginInput")?.value;
  const stored = localStorage.getItem(STORAGE_KEY_PIN);
  if (!stored) { alert("Aucun PIN trouvé. Configurez le wallet d'abord."); return; }
  if (pin !== stored) { alert("PIN incorrect"); return; }

  const pk = localStorage.getItem(STORAGE_KEY_PRIVATE);
  if (!pk) { alert("Aucune clé privée trouvée. Restaurez votre clé."); return; }
  await loadWalletFromPrivateKey(pk);
  showMainUI();
}

async function loadWalletFromPrivateKey(privateKey) {
  try {
    wallet = new ethers.Wallet(privateKey, provider);
    signer = wallet.connect(provider);
    tokenContract = new ethers.Contract(TOKEN_ADDRESS,
      // Minimal ERC20 ABI
      [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function balanceOf(address) view returns (uint256)",
        "function transfer(address to, uint amount) returns (bool)"
      ],
      signer
    );
    await refreshBalance();
    displayAddress(wallet.address);
  } catch (err) {
    console.error("Erreur en chargeant le wallet:", err);
    alert("Impossible de charger le wallet: " + err.message);
  }
}

async function refreshBalance() {
  if (!tokenContract || !wallet) return;
  try {
    const bal = await tokenContract.balanceOf(wallet.address);
    const decimals = await tokenContract.decimals().catch(() => TOKEN_DECIMALS);
    const human = ethers.utils.formatUnits(bal, decimals);
    document.getElementById("balanceValue").innerText = human + " " + TOKEN_SYMBOL;
    // Optionally also show native MATIC balance
    const matic = await provider.getBalance(wallet.address);
    document.getElementById("nativeBalance").innerText = ethers.utils.formatEther(matic) + " MATIC";
  } catch (err) {
    console.error(err);
    document.getElementById("balanceValue").innerText = "Erreur";
  }
}

function displayAddress(addr) {
  document.getElementById("addressValue").innerText = addr || "";
  document.getElementById("qrcode").src = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + encodeURIComponent(addr);
}

async function sendToken() {
  if (!tokenContract || !wallet) { alert("Wallet non chargé"); return; }
  const to = document.getElementById("sendTo")?.value;
  const amount = document.getElementById("sendAmount")?.value;
  if (!ethers.utils.isAddress(to)) { alert("Adresse de destination invalide"); return; }
  if (!amount || isNaN(Number(amount))) { alert("Montant invalide"); return; }
  const decimals = await tokenContract.decimals().catch(() => TOKEN_DECIMALS);
  const amt = ethers.utils.parseUnits(amount, decimals);

  try {
    const tx = await tokenContract.transfer(to, amt);
    alert("Transaction envoyée. Hash: " + tx.hash);
    await tx.wait();
    alert("Transaction confirmée.");
    await refreshBalance();
  } catch (err) {
    console.error(err);
    alert("Erreur lors de l'envoi: " + (err?.message || err));
  }
}

function showMainUI() {
  document.getElementById("pinLoginBox") && (document.getElementById("pinLoginBox").style.display = "none");
  document.getElementById("pinSetupBox") && (document.getElementById("pinSetupBox").style.display = "none");
  document.getElementById("mainBox") && (document.getElementById("mainBox").style.display = "block");
}

// Optional: wipe wallet (for testing)
function wipeWallet() {
  localStorage.removeItem(STORAGE_KEY_PRIVATE);
  localStorage.removeItem(STORAGE_KEY_PIN);
  alert("Données locales supprimées.");
  window.location.reload();
}

// Expose for debugging in console
window.walletApp = {
  refreshBalance, sendToken, wipeWallet, loadWalletFromPrivateKey
};

