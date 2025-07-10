const TOKEN_ADDRESS = "0x64e73E00a9d37188C0e25EC5cfdDCD856Ad7a77D";
const RPC = "https://mainnet.xo-dex.com/rpc";
const DZN_TO_DZD = 120;
let provider, wallet, signer, token, decimals = 18;

window.onload = async () => {
  provider = new ethers.providers.JsonRpcProvider(RPC);
  const savedPK = localStorage.getItem("dzn_key");
  wallet = savedPK ? new ethers.Wallet(savedPK) : ethers.Wallet.createRandom();
  if (!savedPK) localStorage.setItem("dzn_key", wallet.privateKey);
  signer = wallet.connect(provider);
  document.getElementById("address").innerText = wallet.address;
  document.getElementById("privateKeyBox").value = wallet.privateKey;
  generateQRCode(wallet.address);

  token = new ethers.Contract(TOKEN_ADDRESS, [
    { constant: true, inputs: [{ name: "_owner", type: "address" }], name: "balanceOf", outputs: [{ name: "balance", type: "uint256" }], type: "function" },
    { constant: false, inputs: [{ name: "_to", type: "address" }, { name: "_value", type: "uint256" }], name: "transfer", outputs: [{ name: "success", type: "bool" }], type: "function" },
    { constant: true, inputs: [], name: "decimals", outputs: [{ name: "", type: "uint8" }], type: "function" }
  ], signer);

  updateBalance();
};

async function updateBalance() {
  decimals = await token.decimals();
  const raw = await token.balanceOf(wallet.address);
  const dzn = parseFloat(ethers.utils.formatUnits(raw, decimals));
  document.getElementById("balance").innerText = dzn.toFixed(4) + " DZN";
  const dzd = dzn * DZN_TO_DZD;
  document.getElementById("usdValue").innerText = "≈ " + dzd.toFixed(2) + " DZD";
}

function togglePrivateKey() {
  const pkBox = document.getElementById("privateKeyBox");
  pkBox.style.display = pkBox.style.display === "none" ? "block" : "none";
}

async function sendTokens() {
  const to = document.getElementById("to").value.trim();
  const amount = document.getElementById("amount").value.trim();
  if (!ethers.utils.isAddress(to)) return alert("Adresse invalide");
  const tx = await token.transfer(to, ethers.utils.parseUnits(amount, decimals));
  document.getElementById("status").innerText = "⏳ Envoi...";
  await tx.wait();
  document.getElementById("status").innerText = "✅ Envoyé !";
  updateBalance();
}

function generateQRCode(addr) {
  const container = document.getElementById("qrcode");
  container.innerHTML = "";
  new QRCode(container, { text: addr, width: 128, height: 128 });
}