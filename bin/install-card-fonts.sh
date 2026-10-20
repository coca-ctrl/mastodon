#!/usr/bin/env bash
# 카드 스타일 서체를 내려받아 public/card-fonts 에 설치한다. 여러 번 실행해도 안전하다(이미 받은 파일은 건너뜀).
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${ROOT}/public/card-fonts"
CSS="${DEST}/card-fonts.css"
TMP_CSS="${CSS}.tmp"
FAILED=0

mkdir -p "${DEST}"
: > "${TMP_CSS}"

download() {
  local url="$1" out="$2"
  [ -s "${out}" ] && return 0
  if ! curl -fsSL --retry 3 --connect-timeout 15 -o "${out}.part" "${url}"; then
    echo "  실패: ${url}"
    rm -f "${out}.part"
    FAILED=$((FAILED + 1))
    return 1
  fi
  mv "${out}.part" "${out}"
}

# 파일 하나짜리 서체: single 서체이름 폴더 굵기 주소
single() {
  local family="$1" dir="$2" weight="$3" url="$4"
  mkdir -p "${DEST}/${dir}"
  echo "${family} ${weight}"
  if download "${url}" "${DEST}/${dir}/${weight}.woff2"; then
    printf "@font-face{font-family:'%s';font-style:normal;font-display:swap;font-weight:%s;src:url('/card-fonts/%s/%s.woff2') format('woff2');}\n" \
      "${family}" "${weight}" "${dir}" "${weight}" >> "${TMP_CSS}"
  fi
}

# 구글 폰트의 가변 서체를 내려받는다: google_variable 패밀리(주소용) 서체이름 폴더 굵기범위
google_variable() {
  local family_q="$1" family="$2" dir="$3" range="$4"
  local css_tmp f ok=1
  mkdir -p "${DEST}/${dir}"
  echo "${family} 가변 서체 ${range} (조각 파일이 많아 시간이 걸립니다)"
  css_tmp="$(mktemp)"
  if ! curl -fsSL --retry 3 --connect-timeout 15 \
      -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" \
      -o "${css_tmp}" "https://fonts.googleapis.com/css2?family=${family_q}:wght@${range}&display=swap"; then
    echo "  실패: ${family} CSS"
    FAILED=$((FAILED + 1))
    rm -f "${css_tmp}"
    return 1
  fi
  while read -r f; do
    download "${f}" "${DEST}/${dir}/$(basename "${f}")" || ok=0
  done < <(grep -oE "https://fonts\.gstatic\.com/[^)]+\.woff2" "${css_tmp}" | sort -u)
  if [ "${ok}" = 1 ]; then
    perl -0777 -pe "
      s{/\*.*?\*/}{}gs;
      s{url\(https://fonts\.gstatic\.com/[^)]*/([^/)]+\.woff2)\)}{url('/card-fonts/${dir}/\$1')}g;
    " "${css_tmp}" >> "${TMP_CSS}"
  else
    echo "  일부 조각을 받지 못해 ${family} 는 등록하지 않았습니다. 다시 실행하면 이어서 받습니다."
  fi
  rm -f "${css_tmp}"
}

# 글자 범위별 조각으로 나뉜 서체: sliced 패키지 서체이름 폴더 굵기...
sliced() {
  local pkg="$1" family="$2" dir="$3"
  shift 3
  mkdir -p "${DEST}/${dir}"
  local weight css_tmp f ok
  for weight in "$@"; do
    echo "${family} ${weight} (조각 파일이 많아 시간이 걸립니다)"
    css_tmp="$(mktemp)"
    if ! curl -fsSL --retry 3 --connect-timeout 15 -o "${css_tmp}" "https://cdn.jsdelivr.net/npm/${pkg}/${weight}.css"; then
      echo "  실패: ${pkg} ${weight}"
      FAILED=$((FAILED + 1))
      rm -f "${css_tmp}"
      continue
    fi
    ok=1
    while read -r f; do
      download "https://cdn.jsdelivr.net/npm/${pkg}/${f}" "${DEST}/${dir}/$(basename "${f}")" || ok=0
    done < <(grep -oE "files/[A-Za-z0-9._-]+\.woff2" "${css_tmp}" | sort -u)
    if [ "${ok}" = 1 ]; then
      perl -0777 -pe "
        s{/\*.*?\*/}{}gs;
        s{url\(['\"]?(?:\./)?files/([A-Za-z0-9._-]+\.woff2)['\"]?\)\s*format\(['\"]?woff2['\"]?\)\s*,\s*url\(['\"]?(?:\./)?files/[A-Za-z0-9._-]+\.woff['\"]?\)\s*format\(['\"]?woff['\"]?\)}{url('/card-fonts/${dir}/\$1') format('woff2')}g;
      " "${css_tmp}" >> "${TMP_CSS}"
    else
      echo "  일부 조각을 받지 못해 ${family} ${weight} 는 등록하지 않았습니다."
    fi
    rm -f "${css_tmp}"
  done
}

PRETENDARD="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/static/woff2"
single 'Pretendard' pretendard 400 "${PRETENDARD}/Pretendard-Regular.woff2"
single 'Pretendard' pretendard 500 "${PRETENDARD}/Pretendard-Medium.woff2"
single 'Pretendard' pretendard 700 "${PRETENDARD}/Pretendard-Bold.woff2"

google_variable 'Noto+Sans+KR' 'Noto Sans KR' noto-sans-kr '100..900'
google_variable 'Noto+Serif+KR' 'Noto Serif KR' noto-serif-kr '200..900'

single 'KookminUniversitySunggokSerif' kmu-sunggok-serif 400 \
  "https://cdn.jsdelivr.net/gh/Project-Noonnu/2607101542@kmu80sungkokserif/kmu80sungkokserif/KMU80SungkokSerif.woff2"

NALSSAENDORI="https://cdn.jsdelivr.net/gh/projectnoonnu/2606-1@1.1"
single 'Nalssaendori' nalssaendori 300 "${NALSSAENDORI}/CallifontSharpie-Light.woff2"
single 'Nalssaendori' nalssaendori 500 "${NALSSAENDORI}/CallifontSharpie-Medium.woff2"
single 'Nalssaendori' nalssaendori 600 "${NALSSAENDORI}/CallifontSharpie-Bold.woff2"

single 'IncheonEducation' incheon-education 400 \
  "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2307-2@1.0/iceJaram-Rg.woff2"

mv "${TMP_CSS}" "${CSS}"
echo
echo "설치 위치: ${DEST}"
du -sh "${DEST}"
echo "등록된 @font-face: $(grep -c '@font-face' "${CSS}")개 / 실패: ${FAILED}건"