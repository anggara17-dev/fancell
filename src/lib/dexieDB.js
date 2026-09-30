import Dexie from 'dexie'

export const db = new Dexie('TokoHPPOS')
db.version(1).stores({
  products: 'id, name, imei, category',
  pendingTransactions: '++id, client_id, is_synced, created_at',
  paymentMethods: 'id, name'
})
