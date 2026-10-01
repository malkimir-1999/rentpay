import { MoneyDisplay } from '../../components/ui';
import styles from './portal.module.css';

type CustomerTransaction = { id: string; kind: 'PAYMENT' | 'DEPOSIT'; type: string; amountMinor: number; currency: string; method: string | null; createdAt: string; vehicle: { make: string; model: string }; business: { name: string } };

function transactionLabel(transaction: CustomerTransaction) {
  if (transaction.kind === 'PAYMENT') return transaction.type === 'REFUNDED' ? 'Rental payment refunded' : 'Rental payment received';
  if (transaction.type === 'COLLECTED') return 'Security deposit collected';
  if (transaction.type === 'RETAINED') return 'Deposit applied to rental';
  return 'Security deposit refunded';
}

export function CustomerPaymentHistory({ transactions }: { transactions: CustomerTransaction[] }) {
  if (!transactions.length) return null;
  return <section className={styles.section} aria-labelledby="payment-history-title"><div className={styles.sectionHeading}><div><h2 id="payment-history-title">Payments and deposits</h2><p>Recorded rental payments and security-deposit changes.</p></div></div>
    <ul className={styles.transactionList}>{transactions.map((transaction) => <li className={styles.transaction} key={`${transaction.kind}-${transaction.id}`}><div><strong>{transactionLabel(transaction)}</strong><span>{transaction.vehicle.make} {transaction.vehicle.model} · {transaction.business.name}</span><time dateTime={transaction.createdAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(transaction.createdAt))}{transaction.method ? ` · ${transaction.method}` : ''}</time></div><strong className={styles.transactionAmount}><MoneyDisplay amountMinor={transaction.amountMinor} currency={transaction.currency} /></strong></li>)}</ul>
  </section>;
}
