import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';

export function HomePage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.logo}>Préstamos App</h1>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Cerrar sesión
        </button>
      </header>

      <main style={styles.main}>
        <div style={styles.welcome}>
          <h2 style={styles.welcomeTitle}>Bienvenido</h2>
          <p style={styles.welcomeText}>
            Plataforma de gestión de préstamos en criptomonedas y monedas fiat.
          </p>
        </div>

        <div style={styles.grid}>
          <DashboardCard title="Préstamos activos" value="0" />
          <DashboardCard title="Monedas soportadas" value="—" />
          <DashboardCard title="Volumen total" value="$0.00" />
        </div>
      </main>
    </div>
  );
}

function DashboardCard({ title, value }: { title: string; value: string }) {
  return (
    <div style={styles.card}>
      <p style={styles.cardTitle}>{title}</p>
      <p style={styles.cardValue}>{value}</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    borderBottom: '1px solid #334155',
    background: '#1e293b',
  },
  logo: {
    fontSize: '1.25rem',
    fontWeight: 700,
  },
  logoutBtn: {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: '1px solid #334155',
    background: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
  },
  welcome: {
    marginBottom: '2rem',
  },
  welcomeTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
  },
  welcomeText: {
    color: '#94a3b8',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
  },
  card: {
    background: '#1e293b',
    borderRadius: '12px',
    padding: '1.5rem',
    border: '1px solid #334155',
  },
  cardTitle: {
    color: '#94a3b8',
    fontSize: '0.85rem',
    marginBottom: '0.5rem',
  },
  cardValue: {
    fontSize: '1.75rem',
    fontWeight: 700,
  },
};
