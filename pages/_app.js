import { SessionProvider } from 'next-auth/react';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <SessionProvider session={pageProps.session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}

// Add error monitoring
window.onerror = function(msg, url, lineNo, columnNo, error) {
  console.error('Error: ' + msg + '\nURL: ' + url + '\nLine: ' + lineNo);
  return false;
};

export default MyApp;