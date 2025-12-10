// ------- CONFIG POLYGON + TOKEN DZD ---------

const RPC = "https://polygon-rpc.com";
const TOKEN_ADDRESS = "0x07221c2D1dc1D5485Bf069871E2820864B4948F7";
const TOKEN_DECIMALS = 18;
const TOKEN_SYMBOL = "DZD";

const STORAGE_KEY_PRIVATE = "dzd_private_key";
const STORAGE_KEY_PIN = "dzd_pin";

let provider, wallet, signer, tokenContract;


// ----------- INIT -------------
window.addEventListener("load", async () => {
    provider = new ethers.providers.JsonRpcProvider(RPC);

    const pin = localStorage.getItem(STORAGE_KEY_PIN);
    const pk = localStorage.getItem(STORAGE_KEY_PRIVATE);

    if (pin && pk) {
        document.getElementById("pinLoginBox").style.display = "block";
    } else {
        document.getElementById("pinSetupBox").style.display = "block";
    }
});


// ----------- SETUP PIN + CRÉATION WALLET -------------
async function setupPin() {
    const pin = document.getElementById("setupPinInput").value;

    if (!pin || pin.length < 4) {
        alert("Le PIN doit contenir au moins 4 chiffres.");
        return;
    }

    const newWallet = ethers.Wallet.createRandom();

    localStorage.setItem(STORAGE_KEY_PRIVATE, newWallet.privateKey);
    localStorage.setItem(STORAGE_KEY_PIN, pin);

    await loadWallet(newWallet.privateKey);

    alert("Wallet créé ! Sauvegardez votre clé privée !");
    showMainUI();
}


// -------- LOGIN PIN ------------
async function loginPin() {
    const pin = document.getElementById("loginPinInput").value;
    const stored = localStorage.getItem(STORAGE_KEY_PIN);

    if (pin !== stored) {
        alert("PIN incorrect");
        return;
    }

    const pk = localStorage.getItem(STORAGE_KEY_PRIVATE");
    await loadWallet(pk);
    showMainUI();
}


// -------- RESTORE WALLET ----------
async function restoreWallet() {
    const pk = document.getElementById("restoreInput").value;

    if (!pk.startsWith("0x")) {
        alert("Clé privée invalide");
        return;
    }

    localStorage.setItem(STORAGE_KEY_PRIVATE, pk);
    await loadWallet(pk);
    showMainUI();
}


// -------- LOAD WALLET -----------
async function loadWallet(privateKey) {
    try {
        wallet = new ethers.Wallet(privateKey, provider);
        signer = wallet.connect(provider);

        tokenContract = new ethers.Contract(
            TOKEN_ADDRESS,
            [
                "function balanceOf(address) view returns(uint256)",
                "function transfer(address to, uint256 amount) returns(bool)",
                "function decimals() view returns(uint8)"
            ],
            signer
        );

        document.getElementById("myAddress").innerText = wallet.address;

        refreshBalance();

    } catch (e) {
        console.error(e);
        alert("Erreur de chargement du wallet");
    }
}


// ----------- BALANCE -------------
async function refreshBalance() {
    try {
        const raw = await tokenContract.balanceOf(wallet.address);
        const human = ethers.utils.formatUnits(raw, TOKEN_DECIMALS);

        document.getElementById("myBalance").innerText = human + " " + TOKEN_SYMBOL;

        const native = await provider.getBalance(wallet.address);
        document.getElementById("nativeBalance").innerText =
            ethers.utils.formatEther(native) + " MATIC";

    } catch (e) {
        console.error(e);
        alert("Erreur de lecture du solde");
    }
}


// ----------- SEND TOKENS ----------
async function sendTokens() {
    const to = document.getElementById("sendTo").value;
    const amount = document.getElementById("sendAmount").value;

    if (!ethers.utils.isAddress(to)) {
        alert("Adresse invalide");
        return;
    }

    if (!amount || isNaN(amount)) {
        alert("Montant invalide");
        return;
    }

    const units = ethers.utils.parseUnits(amount, TOKEN_DECIMALS);

    try {
        const tx = await tokenContract.transfer(to, units);
        alert("Transaction envoyée: " + tx.hash);
        await tx.wait();
        alert("Transaction confirmée !");
        refreshBalance();

    } catch (e) {
        console.error(e);
        alert("Erreur: " + e.message);
    }
}


// ----------- UI ----------
function showMainUI() {
    document.getElementById("pinSetupBox").style.display = "none";
    document.getElementById("pinLoginBox").style.display = "none";
    document.getElementById("mainBox").style.display = "block";
}

function wipe() {
    localStorage.removeItem(STORAGE_KEY_PRIVATE);
    localStorage.removeItem(STORAGE_KEY_PIN);
    alert("Wallet supprimé !");
    location.reload();
}

