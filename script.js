function notify(message) {
  const notifyEl = document.getElementById('notification');
  const logEl = document.getElementById('log');
  if (notifyEl) notifyEl.textContent = message;
  if (logEl) {
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.textContent = `[${time}] ${message}`;
    logEl.appendChild(entry);
    logEl.parentElement.scrollTop = logEl.parentElement.scrollHeight;
  }
}

function renderResults(html) {
  const results = document.getElementById('results-content');
  if (results) results.innerHTML = html;
}

function setButtonStates({load, query, clear}) {
  const loadBtn = document.getElementById('load-btn');
  const queryBtn = document.getElementById('query-btn');
  const clearBtn = document.getElementById('clear-btn');

  if (loadBtn) loadBtn.disabled = !load;
  if (queryBtn) queryBtn.disabled = !query;
  if (clearBtn) clearBtn.disabled = !clear;
}

class Customer {
  constructor(dbName) {
    this.dbName = dbName;

    if (!window.indexedDB) {
      alert('IndexedDB not supported');
    }
  }

  removeAllRows(callbacks = {}) {
    const { onStart, onEnd, onError } = callbacks;
    onStart && onStart('Clear DB started');

    const request = indexedDB.open(this.dbName, 1);

    request.onsuccess = (event) => {
      const db = event.target.result;
      const txn = db.transaction('customers', 'readwrite');
      const store = txn.objectStore('customers');

      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        onEnd && onEnd('Clear DB completed');
        renderResults('<em>No rows to display.</em>');
      };

      clearReq.onerror = () => {
        const err = clearReq.error?.message || 'Unknown error';
        onError && onError(`Clear DB error: ${err}`);
      };
    };

    request.onerror = () => {
      onError && onError('Clear DB failed to open database');
    };
  }

  initialLoad(customerData, callbacks = {}) {
    const { onStart, onEnd, onError } = callbacks;
    onStart && onStart('Load DB started');

    const request = indexedDB.open(this.dbName, 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('customers')) {
        const store = db.createObjectStore('customers', { keyPath: 'userid' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('email', 'email', { unique: true });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const txn = db.transaction('customers', 'readwrite');
      const store = txn.objectStore('customers');

      customerData.forEach((customer) => {
        store.put(customer);
      });

      txn.oncomplete = () => {
        onEnd && onEnd('Load DB completed');
      };

      txn.onerror = () => {
        const err = txn.error?.message || 'Unknown error';
        onError && onError(`Load DB transaction error: ${err}`);
      };
    };

    request.onerror = () => {
      onError && onError('Load DB failed to open database');
    };
  }

  getAllCustomers(callbacks = {}) {
    const { onStart, onEnd, onError } = callbacks;
    onStart && onStart('Query DB started');

    const request = indexedDB.open(this.dbName, 1);

    request.onsuccess = (event) => {
      const db = event.target.result;
      const txn = db.transaction('customers', 'readonly');
      const store = txn.objectStore('customers');

      const getRequest = store.getAll();

      getRequest.onsuccess = () => {
        const data = getRequest.result;
        if (!data || data.length === 0) {
          renderResults('<em>No rows to display.</em>');
          onEnd && onEnd('Query DB completed (no rows)');
          return;
        }

        let html = '<div style="padding-left: 10px;">';
        data.forEach((c) => {
          const lastOrder = c.lastOrderDate ? `Last order: ${c.lastOrderDate}` : 'Last order: unknown';
          const sales = c.totalSalesYear != null ? `Total sales (year): $${c.totalSalesYear}` : 'Total sales (year): N/A';
          html += `
            <div style="margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 6px;">
              <strong>ID:</strong> ${c.userid}<br>
              <strong>Name:</strong> ${c.name}<br>
              <strong>Email:</strong> ${c.email}<br>
              <strong>${lastOrder}</strong><br>
              <strong>${sales}</strong>
            </div>
          `;
        });
        html += '</div>';

        renderResults(html);
        onEnd && onEnd(`Query DB completed (${data.length} rows)`);
      };

      getRequest.onerror = () => {
        const err = getRequest.error?.message || 'Unknown error';
        onError && onError(`Query DB error: ${err}`);
      };
    };

    request.onerror = () => {
      onError && onError('Query DB failed to open database');
    };
  }
}

const DBNAME = 'customer_db';

function loadDB() {
  setButtonStates({ load: false, query: true, clear: true });

  const sampleData = [
    { userid: '444', name: 'Bill', email: 'bill@company.com', lastOrderDate: '2026-03-20', totalSalesYear: 14250.34 },
    { userid: '555', name: 'Donna', email: 'donna@home.org', lastOrderDate: '2026-03-22', totalSalesYear: 18770.50 }
  ];

  const customer = new Customer(DBNAME);
  customer.initialLoad(sampleData, {
    onStart: notify,
    onEnd: (msg) => { notify(msg); },
    onError: (err) => { notify(err); }
  });
}

function queryDB() {
  setButtonStates({ load: false, query: true, clear: true });

  const customer = new Customer(DBNAME);
  customer.getAllCustomers({
    onStart: notify,
    onEnd: (msg) => { notify(msg); },
    onError: (err) => { notify(err); }
  });
}

function clearDB() {
  setButtonStates({ load: true, query: true, clear: false });

  const customer = new Customer(DBNAME);
  customer.removeAllRows({
    onStart: notify,
    onEnd: (msg) => { notify(msg); },
    onError: (err) => { notify(err); }
  });
}

// initial button state when page loads
setButtonStates({ load: true, query: true, clear: false });
renderResults('<em>No query run yet.</em>');