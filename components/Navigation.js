import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import styles from '../styles/Navigation.module.css';

const Navigation = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const isProfilePage = router.pathname === '/profile';
  const isAdminPage = router.pathname === '/admin';

  return (
    <nav className={styles.nav}>
      <div className={styles.leftNav}>
        {isProfilePage ? (
          <Link href="/" className={styles.navLink}>
            <span className={styles.icon}>←</span>
            Back to Arguments
          </Link>
        ) : (
          <Link href="/" className={styles.navLink}>
            <span className={styles.icon}>🏠</span>
            Home
          </Link>
        )}
      </div>
      
      {session && (
        <div className={styles.rightNav}>
          {!isAdminPage && (
            <Link href="/admin" className={styles.navLink}>
              <span className={styles.icon}>⚙️</span>
              Admin
            </Link>
          )}
          {!isProfilePage && (
            <Link href="/profile" className={styles.navLink}>
              <span className={styles.profileIcon}>👤</span>
              Profile
            </Link>
          )}
          <button 
            onClick={() => signOut()}
            className={styles.logoutButton}
          >
            Log Out
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navigation; 