interface CommitGraphProps {
  history: number[];
}

export function CommitGraph({ history }: CommitGraphProps) {
  const weeks: number[][] = [];

  for (let i = 0; i < history.length; i += 7) {
    weeks.push(history.slice(i, i + 7));
  }

  return (
    <div style={{ display: 'flex', gap: '3px' }}>
      {weeks.map((week, wi) => (
        <div
          key={wi}
          style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}
        >
          {week.map((day, di) => (
            <div
              key={di}
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '2px',
                backgroundColor: day ? '#2d2d2d' : '#e9e5e0',
                opacity: day
                  ? 0.25 + 0.75 * ((wi * 7 + di) / history.length)
                  : 1,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
