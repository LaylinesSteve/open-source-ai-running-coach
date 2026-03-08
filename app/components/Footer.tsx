export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 'auto',
        padding: '2rem 1.5rem',
        background: '#0a0a0a',
        borderTop: '1px solid #262626',
        color: '#737373',
        fontSize: '0.8rem',
        textAlign: 'center',
        lineHeight: 1.6,
      }}
    >
      <p style={{ marginBottom: '0.5rem', fontStyle: 'italic' }}>
        Consult your physician before starting any training plan or exercise program.
      </p>
      <p style={{ marginBottom: '0.25rem' }}>
        © 2026 Anderson Venture Group LLC. All rights reserved.
      </p>
      <p>
        Contact us with feedback at{' '}
        <a
          href="mailto:steve@andersonventuregroup.com"
          style={{ color: '#e85d04', textDecoration: 'none' }}
        >
          steve@andersonventuregroup.com
        </a>
      </p>
    </footer>
  );
}
