import { useCallback, useEffect, useState } from 'react';

import { cardStyleToCss } from 'mastodon/features/card_style/style';
import type { CardStyle } from 'mastodon/features/card_style/style';

import {
  deleteCardPreset,
  fetchCardPresetOptions,
  fetchCardPresets,
  saveCardPreset,
} from '../card_preset_api';
import type { CardPreset, CardPresetOptions } from '../card_preset_api';

import { ColorField } from './color_field';

const LABELS: Record<string, string> = {
  solid: '실선',
  dashed: '긴 점선',
  dotted: '짧은 점선',
  double: '이중선',
  groove: '홈',
  ridge: '돌출',
  cover: '꽉 채우기',
  contain: '전체 보이기',
  auto: '원본 크기',
  center: '가운데',
  top: '위',
  bottom: '아래',
  left: '왼쪽',
  right: '오른쪽',
  'no-repeat': '반복 안 함',
  repeat: '반복',
  'repeat-x': '가로 반복',
  'repeat-y': '세로 반복',
  stretch: '늘이기',
  round: '맞춰 반복',
  space: '간격 반복',
  linear: '선형',
  radial: '원형',
  circle: '원',
  ellipse: '타원',
};

interface GradientStopForm {
  color: string;
  position: number;
}

interface FormState {
  name: string;
  backgroundColor: string;
  gradientEnabled: boolean;
  gradientType: string;
  gradientAngle: number;
  gradientShape: string;
  gradientStops: GradientStopForm[];
  backgroundSize: string;
  backgroundPosition: string;
  backgroundRepeat: string;
  backgroundImage: File | null;
  removeBackgroundImage: boolean;
  borderWidth: number;
  borderStyle: string;
  borderColor: string;
  borderRadius: number;
  borderImage: File | null;
  removeBorderImage: boolean;
  borderImageSlice: number;
  borderImageWidth: number;
  borderImageRepeat: string;
  textColor: string;
  fontKey: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  padding: number;
}

const emptyForm = (): FormState => ({
  name: '',
  backgroundColor: '#1e1e2e',
  gradientEnabled: false,
  gradientType: 'linear',
  gradientAngle: 180,
  gradientShape: 'circle',
  gradientStops: [
    { color: '#ffffff', position: 0 },
    { color: '#000000', position: 100 },
  ],
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  backgroundImage: null,
  removeBackgroundImage: false,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: '#585b70',
  borderRadius: 12,
  borderImage: null,
  removeBorderImage: false,
  borderImageSlice: 30,
  borderImageWidth: 12,
  borderImageRepeat: 'round',
  textColor: '#ffffff',
  fontKey: 'pretendard',
  fontWeight: 400,
  fontSize: 15,
  lineHeight: 160,
  padding: 16,
});

const formFromPreset = (preset: CardPreset): FormState => {
  const base = emptyForm();
  const gradient = preset.background.gradient;

  return {
    ...base,
    name: preset.name,
    backgroundColor: preset.background.color ?? '',
    gradientEnabled: !!gradient,
    gradientType: gradient?.type ?? base.gradientType,
    gradientAngle: gradient?.angle ?? base.gradientAngle,
    gradientShape: gradient?.shape ?? base.gradientShape,
    gradientStops: gradient?.stops ?? base.gradientStops,
    backgroundSize: preset.background.size,
    backgroundPosition: preset.background.position,
    backgroundRepeat: preset.background.repeat,
    borderWidth: preset.border.width,
    borderStyle: preset.border.style,
    borderColor: preset.border.color ?? '',
    borderRadius: preset.border.radius,
    borderImageSlice: preset.border.image_slice,
    borderImageWidth: preset.border.image_width,
    borderImageRepeat: preset.border.image_repeat,
    textColor: preset.text.color ?? '',
    fontKey: preset.text.font_key,
    fontWeight: preset.text.font_weight,
    fontSize: preset.text.font_size,
    lineHeight: preset.text.line_height,
    padding: preset.padding,
  };
};

const toFormData = (form: FormState): FormData => {
  const data = new FormData();

  data.append('name', form.name.trim());
  data.append('background_color', form.backgroundColor);
  data.append(
    'background_gradient',
    form.gradientEnabled
      ? JSON.stringify({
          type: form.gradientType,
          angle: Math.round(form.gradientAngle),
          shape: form.gradientShape,
          stops: form.gradientStops.map((stop) => ({
            color: stop.color,
            position: Math.round(stop.position),
          })),
        })
      : '',
  );
  data.append('background_size', form.backgroundSize);
  data.append('background_position', form.backgroundPosition);
  data.append('background_repeat', form.backgroundRepeat);
  data.append('border_width', String(form.borderWidth));
  data.append('border_style', form.borderStyle);
  data.append('border_color', form.borderColor);
  data.append('border_radius', String(form.borderRadius));
  data.append('border_image_slice', String(form.borderImageSlice));
  data.append('border_image_width', String(form.borderImageWidth));
  data.append('border_image_repeat', form.borderImageRepeat);
  data.append('text_color', form.textColor);
  data.append('font_key', form.fontKey);
  data.append('font_weight', String(form.fontWeight));
  data.append('font_size', String(form.fontSize));
  data.append('line_height', String(form.lineHeight));
  data.append('padding', String(form.padding));

  if (form.backgroundImage) {
    data.append('background_image', form.backgroundImage);
  }
  if (form.removeBackgroundImage) {
    data.append('remove_background_image', 'true');
  }
  if (form.borderImage) {
    data.append('border_image', form.borderImage);
  }
  if (form.removeBorderImage) {
    data.append('remove_border_image', 'true');
  }

  return data;
};

const errorMessage = (error: unknown): string => {
  const data = (error as { response?: { data?: { error?: string } } }).response
    ?.data;

  return data?.error ?? '저장하지 못했습니다.';
};

const useObjectUrl = (file: File | null) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return url;
};

const resolveImage = (
  file: File | null,
  objectUrl: string | null,
  removed: boolean,
  existing: string | null,
) => {
  if (file) {
    return objectUrl;
  }
  return removed ? null : existing;
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className='card-editor__row'>
    <span className='card-editor__label'>{label}</span>
    <div className='card-editor__control'>{children}</div>
  </div>
);

const NumberField: React.FC<{
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}> = ({ value, min, max, suffix, onChange }) => (
  <span>
    <input
      type='number'
      className='card-editor__number'
      value={value}
      min={min}
      max={max}
      onChange={(e) => {
        const next = Number(e.target.value);
        if (!Number.isNaN(next)) {
          onChange(Math.min(max, Math.max(min, Math.round(next))));
        }
      }}
    />
    {suffix}
  </span>
);

const SelectField: React.FC<{
  value: string;
  values: string[];
  onChange: (value: string) => void;
}> = ({ value, values, onChange }) => (
  <select
    className='card-editor__select'
    value={value}
    onChange={(e) => {
      onChange(e.target.value);
    }}
  >
    {values.map((item) => (
      <option key={item} value={item}>
        {LABELS[item] ?? item}
      </option>
    ))}
  </select>
);

const FALLBACK_FONT = {
  key: 'pretendard',
  label: '',
  family: 'sans-serif',
  weights: [400],
};

const CardPresetEditor: React.FC<{
  preset: CardPreset | null;
  options: CardPresetOptions;
  onDone: (saved: boolean) => void;
}> = ({ preset, options, onDone }) => {
  const [form, setForm] = useState<FormState>(() =>
    preset ? formFromPreset(preset) : emptyForm(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backgroundObjectUrl = useObjectUrl(form.backgroundImage);
  const borderObjectUrl = useObjectUrl(form.borderImage);

  const update = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const font =
    options.fonts.find((item) => item.key === form.fontKey) ?? FALLBACK_FONT;

  const backgroundImageUrl = resolveImage(
    form.backgroundImage,
    backgroundObjectUrl,
    form.removeBackgroundImage,
    preset?.background.image_url ?? null,
  );
  const borderImageUrl = resolveImage(
    form.borderImage,
    borderObjectUrl,
    form.removeBorderImage,
    preset?.border.image_url ?? null,
  );

  const previewStyle: CardStyle = {
    id: preset?.id ?? 0,
    background: {
      color: form.backgroundColor || null,
      gradient: form.gradientEnabled
        ? {
            type: form.gradientType === 'radial' ? 'radial' : 'linear',
            angle: form.gradientAngle,
            shape: form.gradientShape === 'ellipse' ? 'ellipse' : 'circle',
            stops: form.gradientStops,
          }
        : null,
      image_url: backgroundImageUrl,
      size: form.backgroundSize,
      position: form.backgroundPosition,
      repeat: form.backgroundRepeat,
    },
    border: {
      width: form.borderWidth,
      style: form.borderStyle,
      color: form.borderColor || null,
      radius: form.borderRadius,
      image_url: borderImageUrl,
      image_slice: form.borderImageSlice,
      image_width: form.borderImageWidth,
      image_repeat: form.borderImageRepeat,
    },
    text: {
      color: form.textColor || null,
      font_key: form.fontKey,
      font_family: font.family,
      font_weight: form.fontWeight,
      font_size: form.fontSize,
      line_height: form.lineHeight,
    },
    padding: form.padding,
  };

  const handleFontChange = (key: string) => {
    const next = options.fonts.find((item) => item.key === key);

    setForm((prev) => {
      const weights = next?.weights ?? [400];
      let weight = prev.fontWeight;

      if (!weights.includes(weight)) {
        weight = weights.includes(400) ? 400 : (weights[0] ?? 400);
      }

      return { ...prev, fontKey: key, fontWeight: weight };
    });
  };

  const pickImage = (kind: 'background' | 'border', file: File | null) => {
    if (!file) {
      return;
    }

    const limitMb =
      kind === 'background'
        ? options.limits.background_image_mb
        : options.limits.border_image_mb;

    if (file.size > limitMb * 1024 * 1024) {
      setError(`이미지는 ${limitMb}MB 이하여야 합니다.`);
      return;
    }

    setError(null);
    setForm((prev) =>
      kind === 'background'
        ? { ...prev, backgroundImage: file, removeBackgroundImage: false }
        : { ...prev, borderImage: file, removeBorderImage: false },
    );
  };

  const clearImage = (kind: 'background' | 'border') => {
    setForm((prev) =>
      kind === 'background'
        ? { ...prev, backgroundImage: null, removeBackgroundImage: true }
        : { ...prev, borderImage: null, removeBorderImage: true },
    );
  };

  const updateStop = (index: number, patch: Partial<GradientStopForm>) => {
    update(
      'gradientStops',
      form.gradientStops.map((stop, i) =>
        i === index ? { ...stop, ...patch } : stop,
      ),
    );
  };

  const addStop = () => {
    update('gradientStops', [
      ...form.gradientStops,
      { color: '#ffffff', position: 100 },
    ]);
  };

  const removeStop = (index: number) => {
    update(
      'gradientStops',
      form.gradientStops.filter((_, i) => i !== index),
    );
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      setError('이름을 입력해 주세요.');
      return;
    }

    setSaving(true);
    setError(null);

    saveCardPreset(preset?.id ?? null, toFormData(form))
      .then(() => {
        onDone(true);
      })
      .catch((e: unknown) => {
        setError(errorMessage(e));
        setSaving(false);
      });
  };

  return (
    <div className='card-editor'>
      <div className='card-editor__preview'>
        <div className='card-styled' style={cardStyleToCss(previewStyle)}>
          <p>카드 미리보기 문장입니다. 가나다라마바사 ABC abc 123</p>
          <p>
            <span className='card-styled__link'>@멘션</span>{' '}
            <span className='card-styled__link'>#해시태그</span>
          </p>
        </div>
      </div>

      <section className='card-editor__section'>
        <Row label='이름'>
          <input
            type='text'
            className='card-editor__text'
            maxLength={30}
            value={form.name}
            onChange={(e) => {
              update('name', e.target.value);
            }}
          />
        </Row>
      </section>

      <section className='card-editor__section'>
        <h3>배경</h3>
        <Row label='배경색'>
          <ColorField
            allowEmpty
            value={form.backgroundColor}
            onChange={(value) => {
              update('backgroundColor', value);
            }}
          />
        </Row>

        <Row label='그라데이션'>
          <label>
            <input
              type='checkbox'
              checked={form.gradientEnabled}
              onChange={(e) => {
                update('gradientEnabled', e.target.checked);
              }}
            />{' '}
            사용 (이미지 위에 겹쳐져요)
          </label>
        </Row>

        {form.gradientEnabled && (
          <>
            <Row label='종류'>
              <SelectField
                value={form.gradientType}
                values={options.gradient_types}
                onChange={(value) => {
                  update('gradientType', value);
                }}
              />
              {form.gradientType === 'linear' ? (
                <NumberField
                  value={form.gradientAngle}
                  min={0}
                  max={360}
                  suffix='도'
                  onChange={(value) => {
                    update('gradientAngle', value);
                  }}
                />
              ) : (
                <SelectField
                  value={form.gradientShape}
                  values={['circle', 'ellipse']}
                  onChange={(value) => {
                    update('gradientShape', value);
                  }}
                />
              )}
            </Row>
            <Row label='색 지점'>
              <div>
                {form.gradientStops.map((stop, index) => (
                  <div key={index} className='card-editor__stop'>
                    <ColorField
                      value={stop.color}
                      onChange={(value) => {
                        updateStop(index, { color: value });
                      }}
                    />
                    <NumberField
                      value={stop.position}
                      min={0}
                      max={100}
                      suffix='%'
                      onChange={(value) => {
                        updateStop(index, { position: value });
                      }}
                    />
                    <button
                      type='button'
                      className='card-button'
                      disabled={form.gradientStops.length <= 2}
                      onClick={() => {
                        removeStop(index);
                      }}
                    >
                      삭제
                    </button>
                  </div>
                ))}
                <button
                  type='button'
                  className='card-button'
                  disabled={form.gradientStops.length >= 6}
                  onClick={addStop}
                >
                  색 추가
                </button>
              </div>
            </Row>
          </>
        )}

        <Row label='배경 이미지'>
          <input
            type='file'
            accept='image/png,image/jpeg,image/webp'
            onChange={(e) => {
              pickImage('background', e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
          {backgroundImageUrl && (
            <>
              <img
                className='card-editor__thumb'
                src={backgroundImageUrl}
                alt=''
              />
              <button
                type='button'
                className='card-button'
                onClick={() => {
                  clearImage('background');
                }}
              >
                이미지 제거
              </button>
            </>
          )}
          <span className='card-editor__hint'>
            {options.limits.background_image_mb}MB 이하
          </span>
        </Row>

        {backgroundImageUrl && (
          <>
            <Row label='크기'>
              <SelectField
                value={form.backgroundSize}
                values={options.background_sizes}
                onChange={(value) => {
                  update('backgroundSize', value);
                }}
              />
            </Row>
            <Row label='위치'>
              <SelectField
                value={form.backgroundPosition}
                values={options.background_positions}
                onChange={(value) => {
                  update('backgroundPosition', value);
                }}
              />
            </Row>
            <Row label='반복'>
              <SelectField
                value={form.backgroundRepeat}
                values={options.background_repeats}
                onChange={(value) => {
                  update('backgroundRepeat', value);
                }}
              />
            </Row>
          </>
        )}
      </section>

      <section className='card-editor__section'>
        <h3>테두리</h3>
        <Row label='두께'>
          <NumberField
            value={form.borderWidth}
            min={0}
            max={32}
            suffix='px'
            onChange={(value) => {
              update('borderWidth', value);
            }}
          />
        </Row>
        <Row label='모양'>
          <SelectField
            value={form.borderStyle}
            values={options.border_styles}
            onChange={(value) => {
              update('borderStyle', value);
            }}
          />
        </Row>
        <Row label='색'>
          <ColorField
            allowEmpty
            value={form.borderColor}
            onChange={(value) => {
              update('borderColor', value);
            }}
          />
        </Row>
        <Row label='모서리 둥글기'>
          <NumberField
            value={form.borderRadius}
            min={0}
            max={64}
            suffix='px'
            onChange={(value) => {
              update('borderRadius', value);
            }}
          />
        </Row>

        <Row label='이미지 보더'>
          <input
            type='file'
            accept='image/png,image/jpeg,image/webp'
            onChange={(e) => {
              pickImage('border', e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
          {borderImageUrl && (
            <>
              <img
                className='card-editor__thumb'
                src={borderImageUrl}
                alt=''
              />
              <button
                type='button'
                className='card-button'
                onClick={() => {
                  clearImage('border');
                }}
              >
                이미지 제거
              </button>
            </>
          )}
          <span className='card-editor__hint'>
            {options.limits.border_image_mb}MB 이하. 켜면 위의 두께/모양/색
            대신 이미지가 테두리로 쓰여요.
          </span>
        </Row>

        {borderImageUrl && (
          <>
            <Row label='자르기 값'>
              <NumberField
                value={form.borderImageSlice}
                min={1}
                max={1000}
                suffix='px'
                onChange={(value) => {
                  update('borderImageSlice', value);
                }}
              />
              <span className='card-editor__hint'>
                이미지의 모서리 조각 크기예요.
              </span>
            </Row>
            <Row label='테두리 두께'>
              <NumberField
                value={form.borderImageWidth}
                min={1}
                max={64}
                suffix='px'
                onChange={(value) => {
                  update('borderImageWidth', value);
                }}
              />
            </Row>
            <Row label='반복 방식'>
              <SelectField
                value={form.borderImageRepeat}
                values={options.border_image_repeats}
                onChange={(value) => {
                  update('borderImageRepeat', value);
                }}
              />
            </Row>
          </>
        )}
      </section>

      <section className='card-editor__section'>
        <h3>글자</h3>
        <Row label='글자색'>
          <ColorField
            allowEmpty
            value={form.textColor}
            onChange={(value) => {
              update('textColor', value);
            }}
          />
        </Row>
        <Row label='서체'>
          <select
            className='card-editor__select'
            value={form.fontKey}
            onChange={(e) => {
              handleFontChange(e.target.value);
            }}
          >
            {options.fonts.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            className='card-editor__select'
            value={form.fontWeight}
            onChange={(e) => {
              update('fontWeight', Number(e.target.value));
            }}
          >
            {font.weights.map((weight) => (
              <option key={weight} value={weight}>
                굵기 {weight}
              </option>
            ))}
          </select>
          <span className='card-editor__hint'>
            서체 파일을 등록하기 전에는 미리보기에 기본 서체로 보일 수 있어요.
          </span>
        </Row>
        <Row label='글자 크기'>
          <NumberField
            value={form.fontSize}
            min={12}
            max={28}
            suffix='px'
            onChange={(value) => {
              update('fontSize', value);
            }}
          />
        </Row>
        <Row label='줄 간격'>
          <NumberField
            value={form.lineHeight}
            min={100}
            max={250}
            suffix='%'
            onChange={(value) => {
              update('lineHeight', value);
            }}
          />
        </Row>
        <Row label='안쪽 여백'>
          <NumberField
            value={form.padding}
            min={0}
            max={48}
            suffix='px'
            onChange={(value) => {
              update('padding', value);
            }}
          />
        </Row>
      </section>

      {error && <div className='card-editor__error'>{error}</div>}

      <div className='card-editor__buttons'>
        <button
          type='button'
          className='card-button'
          disabled={saving}
          onClick={() => {
            onDone(false);
          }}
        >
          취소
        </button>
        <button
          type='button'
          className='card-button card-button--primary'
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  );
};

export const CardPresetPanel: React.FC = () => {
  const [presets, setPresets] = useState<CardPreset[]>([]);
  const [options, setOptions] = useState<CardPresetOptions | null>(null);
  const [editing, setEditing] = useState<{ preset: CardPreset | null } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchCardPresets()
      .then((data) => {
        setPresets(data);
      })
      .catch(() => {
        setError('목록을 불러오지 못했습니다.');
      });
  }, []);

  useEffect(() => {
    load();

    fetchCardPresetOptions()
      .then((data) => {
        setOptions(data);
      })
      .catch(() => {
        setError('설정 정보를 불러오지 못했습니다.');
      });
  }, [load]);

  const handleDelete = (preset: CardPreset) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`"${preset.name}" 카드 스타일을 삭제할까요?`)) {
      return;
    }

    setError(null);
    deleteCardPreset(preset.id)
      .then(() => {
        load();
      })
      .catch((e: unknown) => {
        setError(errorMessage(e));
      });
  };

  if (editing && options) {
    return (
      <div className='card-preset-panel'>
        <CardPresetEditor
          preset={editing.preset}
          options={options}
          onDone={(saved) => {
            setEditing(null);
            if (saved) {
              load();
            }
          }}
        />
      </div>
    );
  }

  const maxPresets = options?.limits.max_presets ?? 20;

  return (
    <div className='card-preset-panel'>
      <div className='card-preset-panel__top'>
        <span>
          {presets.length} / {maxPresets}
        </span>
        <button
          type='button'
          className='card-button card-button--primary'
          disabled={!options || presets.length >= maxPresets}
          onClick={() => {
            setEditing({ preset: null });
          }}
        >
          새 카드 스타일
        </button>
      </div>

      {error && <div className='card-editor__error'>{error}</div>}

      <div className='card-preset-list'>
        {presets.map((preset) => (
          <div key={preset.id} className='card-preset-item'>
            <div
              className='card-styled card-preset-item__sample'
              style={cardStyleToCss(preset)}
            >
              가나다라 Aa 123
            </div>
            <div className='card-preset-item__info'>
              <strong>{preset.name}</strong>
              <span>사용 중인 게시물 {preset.used_count}개</span>
            </div>
            <div className='card-preset-item__actions'>
              <button
                type='button'
                className='card-button'
                onClick={() => {
                  setEditing({ preset });
                }}
              >
                수정
              </button>
              <button
                type='button'
                className='card-button'
                disabled={preset.used_count > 0}
                title={
                  preset.used_count > 0
                    ? '사용 중인 게시물이 있어 삭제할 수 없습니다.'
                    : undefined
                }
                onClick={() => {
                  handleDelete(preset);
                }}
              >
                삭제
              </button>
            </div>
          </div>
        ))}

        {presets.length === 0 && !error && (
          <div className='card-editor__hint'>
            등록된 카드 스타일이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};