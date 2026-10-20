const HEX6 = /^#[0-9a-fA-F]{6}/;
const HEX8 = /^#[0-9a-fA-F]{8}$/;

const parseColor = (value: string) => {
  const base = HEX6.test(value) ? value.slice(0, 7).toLowerCase() : '#000000';
  const alpha = HEX8.test(value) ? parseInt(value.slice(7, 9), 16) / 255 : 1;

  return { base, alpha };
};

const buildColor = (base: string, alpha: number) => {
  if (alpha >= 1) {
    return base;
  }

  const hex = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');

  return `${base}${hex}`;
};

export const ColorField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
}> = ({ value, onChange, allowEmpty = false }) => {
  const empty = value === '';
  const { base, alpha } = parseColor(value);
  const percent = Math.round(alpha * 100);

  return (
    <span className='card-color-field'>
      {allowEmpty && (
        <label>
          <input
            type='checkbox'
            checked={empty}
            onChange={(e) => {
              onChange(e.target.checked ? '' : buildColor(base, alpha));
            }}
          />{' '}
          없음
        </label>
      )}
      <input
        type='color'
        value={base}
        disabled={empty}
        onChange={(e) => {
          onChange(buildColor(e.target.value, alpha));
        }}
      />
      <input
        type='range'
        min={0}
        max={100}
        value={percent}
        disabled={empty}
        onChange={(e) => {
          onChange(buildColor(base, Number(e.target.value) / 100));
        }}
      />
      <span className='card-color-field__alpha'>{percent}%</span>
    </span>
  );
};