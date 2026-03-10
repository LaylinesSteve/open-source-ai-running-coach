export default function Footer() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const copyright = process.env.NEXT_PUBLIC_COPYRIGHT;

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
      {copyright && (
        <p style={{ marginBottom: '0.25rem' }}>
          {copyright}
        </p>
      )}
      <p>
        {contactEmail ? (
          <>
            Contact us with feedback at{' '}
            <a
              href={`mailto:${contactEmail}`}
              style={{ color: '#e85d04', textDecoration: 'none' }}
            >
              {contactEmail}
            </a>
          </>
        ) : (
          <>
            Feedback? Open an issue in the project repository.
          </>
        )}
      </p>
    </footer>
  );
}
