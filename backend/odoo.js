const Odoo = require("odoo-xmlrpc");

let odooInstance = null;

function initOdoo(username, password) {
  odooInstance = new Odoo({
    url: "https://home.seacorp.vn",
    port: 443,
    db: "opensea12pro",
    username: username || process.env.USERNAME,
    password: password || process.env.PASSWORD,
  });
}

// Khởi tạo mặc định
initOdoo();

function connectOdoo() {
  return new Promise((resolve, reject) => {
    if (!odooInstance) return reject(new Error("Odoo not initialized"));
    odooInstance.connect((err, uid) => {
      if (err) {
        reject(err);
      } else {
        resolve(uid);
      }
    });
  });
}

function getOdoo() {
  return odooInstance;
}

module.exports = {
  getOdoo,
  connectOdoo,
  initOdoo,
};
