interface HeaderProps {
  onCheckIn: () => void;
}

export function Header({ onCheckIn }: HeaderProps) {
  return (
    <header
      style={{
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #eae6e1',
        backgroundColor: '#fff',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: '22px',
          fontWeight: 700,
          color: '#2d2d2d',
          letterSpacing: '-0.03em',
        }}
      >
        momentum
      </h1>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          style={{
            padding: '12px 20px',
            backgroundColor: 'transparent',
            border: '1px solid #eae6e1',
            borderRadius: '12px',
            color: '#5a554e',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Weekly Report
        </button>
        <button
          onClick={onCheckIn}
          style={{
            padding: '12px 24px',
            backgroundColor: '#2d2d2d',
            border: 'none',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Check in
        </button>
      </div>
    </header>
  );
}
