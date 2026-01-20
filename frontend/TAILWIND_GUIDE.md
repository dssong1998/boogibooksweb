# Tailwind CSS 가이드

## 기본 개념

Tailwind CSS는 **유틸리티 퍼스트(Utility-First)** CSS 프레임워크입니다. 미리 정의된 클래스를 조합해서 스타일을 적용합니다.

## 기본 문법 구조

```tsx
<div className="클래스1 클래스2 클래스3">
```

여러 클래스를 공백으로 구분해서 나열합니다.

---

## 📐 레이아웃 (Layout)

### 컨테이너 & 너비
```tsx
<div className="container mx-auto">     {/* 중앙 정렬 컨테이너 */}
<div className="w-full">                 {/* 너비 100% */}
<div className="w-1/2">                  {/* 너비 50% */}
<div className="max-w-4xl mx-auto">      {/* 최대 너비 + 중앙 정렬 */}
```

### Flexbox
```tsx
<div className="flex">                  {/* flex 컨테이너 */}
<div className="flex flex-col">         {/* 세로 방향 */}
<div className="flex items-center">     {/* 세로 중앙 정렬 */}
<div className="flex justify-center">   {/* 가로 중앙 정렬 */}
<div className="flex justify-between"> {/* 양쪽 끝 정렬 */}
<div className="flex gap-4">           {/* 자식 요소 간격 1rem */}
```

### Grid
```tsx
<div className="grid grid-cols-3">      {/* 3열 그리드 */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"> {/* 반응형 */}
<div className="gap-4">                 {/* 그리드 간격 */}
```

### 위치
```tsx
<div className="relative">              {/* 상대 위치 */}
<div className="absolute top-0 left-0"> {/* 절대 위치 */}
<div className="fixed top-0">           {/* 고정 위치 */}
<div className="sticky top-0">          {/* 스크롤 시 고정 */}
```

---

## 🎨 색상 (Colors)

### 배경색
```tsx
<div className="bg-white">             {/* 흰색 배경 */}
<div className="bg-blue-500">           {/* 파란색 배경 */}
<div className="bg-gray-100">           {/* 연한 회색 배경 */}
<div className="bg-gradient-to-r from-blue-500 to-purple-500"> {/* 그라데이션 */}
```

### 텍스트 색상
```tsx
<p className="text-black">              {/* 검은색 텍스트 */}
<p className="text-blue-600">          {/* 파란색 텍스트 */}
<p className="text-gray-500">          {/* 회색 텍스트 */}
```

### 색상 강도 (50~900)
- `50`: 가장 연함
- `100`, `200`, `300`: 연함
- `400`, `500`: 중간
- `600`, `700`: 진함
- `800`, `900`: 가장 진함

예: `bg-blue-50`, `bg-blue-100`, ..., `bg-blue-900`

---

## 📝 텍스트 (Typography)

### 크기
```tsx
<p className="text-xs">                 {/* 매우 작음 (0.75rem) */}
<p className="text-sm">                 {/* 작음 (0.875rem) */}
<p className="text-base">               {/* 기본 (1rem) */}
<p className="text-lg">                 {/* 큼 (1.125rem) */}
<p className="text-xl">                 {/* 더 큼 (1.25rem) */}
<p className="text-2xl">                 {/* 2xl (1.5rem) */}
<p className="text-3xl">                 {/* 3xl (1.875rem) */}
<p className="text-4xl">                 {/* 4xl (2.25rem) */}
<p className="text-5xl">                 {/* 5xl (3rem) */}
```

### 굵기
```tsx
<p className="font-thin">               {/* 100 */}
<p className="font-normal">             {/* 400 */}
<p className="font-medium">             {/* 500 */}
<p className="font-semibold">           {/* 600 */}
<p className="font-bold">               {/* 700 */}
<p className="font-extrabold">          {/* 800 */}
```

### 정렬
```tsx
<p className="text-left">                {/* 왼쪽 정렬 */}
<p className="text-center">             {/* 중앙 정렬 */}
<p className="text-right">              {/* 오른쪽 정렬 */}
```

### 기타
```tsx
<p className="uppercase">                {/* 대문자 */}
<p className="lowercase">                {/* 소문자 */}
<p className="capitalize">               {/* 첫 글자 대문자 */}
<p className="underline">                {/* 밑줄 */}
<p className="line-through">            {/* 취소선 */}
<p className="truncate">                {/* 말줄임표 */}
```

---

## 📦 간격 (Spacing)

### 패딩 (내부 여백)
```tsx
<div className="p-4">                       {/* 모든 방향 1rem */}
<div className="px-4">                     {/* 좌우 1rem */}
<div className="py-4">                     {/* 상하 1rem */}
<div className="pt-4 pb-2 px-6">          {/* 개별 설정 */}
```

### 마진 (외부 여백)
```tsx
<div className="m-4">                     {/* 모든 방향 1rem */}
<div className="mx-auto">                 {/* 좌우 자동 (중앙 정렬) */}
<div className="mb-8">                    {/* 하단 2rem */}
<div className="mt-4">                    {/* 상단 1rem */}
```

### 간격 값
- `0`: 0
- `1`: 0.25rem (4px)
- `2`: 0.5rem (8px)
- `4`: 1rem (16px)
- `6`: 1.5rem (24px)
- `8`: 2rem (32px)
- `12`: 3rem (48px)
- `16`: 4rem (64px)

---

## 🖼️ 크기 (Sizing)

### 너비
```tsx
<div className="w-full">                  {/* 100% */}
<div className="w-1/2">                  {/* 50% */}
<div className="w-64">                   {/* 16rem (256px) */}
<div className="w-screen">                {/* 화면 전체 너비 */}
<div className="max-w-md">                {/* 최대 너비 28rem */}
```

### 높이
```tsx
<div className="h-full">                  {/* 100% */}
<div className="h-screen">               {/* 화면 전체 높이 */}
<div className="min-h-screen">          {/* 최소 화면 높이 */}
<div className="h-64">                  {/* 16rem (256px) */}
```

---

## 🎭 테두리 & 둥글게 (Borders & Rounded)

### 테두리
```tsx
<div className="border">                 {/* 기본 테두리 */}
<div className="border-2">               {/* 두꺼운 테두리 */}
<div className="border-blue-500">        {/* 파란색 테두리 */}
<div className="border-t">               {/* 상단만 */}
<div className="border-b-2">             {/* 하단만 두꺼운 */}
```

### 둥글게
```tsx
<div className="rounded">                {/* 약간 둥글게 */}
<div className="rounded-lg">             {/* 더 둥글게 */}
<div className="rounded-full">           {/* 완전히 둥글게 (원) */}
<div className="rounded-t-lg">           {/* 상단만 둥글게 */}
```

---

## 🎯 그림자 (Shadows)

```tsx
<div className="shadow">                 {/* 기본 그림자 */}
<div className="shadow-md">              {/* 중간 그림자 */}
<div className="shadow-lg">              {/* 큰 그림자 */}
<div className="shadow-xl">              {/* 매우 큰 그림자 */}
<div className="shadow-2xl">             {/* 가장 큰 그림자 */}
<div className="shadow-none">             {/* 그림자 없음 */}
```

---

## 🌙 다크모드 (Dark Mode)

```tsx
<div className="bg-white dark:bg-gray-900">        {/* 다크모드 배경 */}
<p className="text-black dark:text-white">         {/* 다크모드 텍스트 */}
<div className="border-gray-200 dark:border-gray-700"> {/* 다크모드 테두리 */}
```

`dark:` 접두사를 사용하면 다크모드에서만 적용됩니다.

---

## 📱 반응형 디자인 (Responsive)

### 브레이크포인트
- `sm`: 640px 이상
- `md`: 768px 이상
- `lg`: 1024px 이상
- `xl`: 1280px 이상
- `2xl`: 1536px 이상

### 사용법
```tsx
<div className="text-sm md:text-base lg:text-lg">   {/* 화면 크기에 따라 텍스트 크기 변경 */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"> {/* 반응형 그리드 */}
<div className="hidden md:block">                   {/* 모바일에서 숨김, 데스크톱에서 표시 */}
<div className="block md:hidden">                   {/* 모바일에서만 표시 */}
```

---

## 🎨 호버 & 포커스 (Hover & Focus)

```tsx
<button className="bg-blue-500 hover:bg-blue-600">     {/* 호버 시 색상 변경 */}
<button className="hover:scale-105">                   {/* 호버 시 확대 */}
<input className="focus:ring-2 focus:ring-blue-500">   {/* 포커스 시 링 표시 */}
<a className="hover:underline">                       {/* 호버 시 밑줄 */}
```

---

## 🔄 전환 효과 (Transitions)

```tsx
<button className="transition-colors">                 {/* 색상 전환 */}
<button className="transition-all duration-300">         {/* 모든 속성, 300ms */}
<button className="hover:scale-110 transition-transform"> {/* 호버 시 확대 애니메이션 */}
```

---

## 📋 실전 예시

### 카드 컴포넌트
```tsx
<div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
  <h2 className="text-2xl font-bold mb-4">제목</h2>
  <p className="text-gray-600">내용</p>
</div>
```

### 버튼
```tsx
<button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
  클릭하세요
</button>
```

### 반응형 레이아웃
```tsx
<div className="container mx-auto px-4">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {/* 카드들 */}
  </div>
</div>
```

### 헤로 섹션
```tsx
<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
  <div className="text-center text-white">
    <h1 className="text-5xl font-bold mb-4">환영합니다</h1>
    <p className="text-xl">설명 텍스트</p>
  </div>
</div>
```

---

## 💡 팁

1. **클래스 순서는 중요하지 않습니다** - Tailwind는 순서와 무관하게 작동합니다
2. **조합해서 사용** - 여러 클래스를 조합해서 원하는 디자인을 만듭니다
3. **반응형은 모바일 퍼스트** - 기본값이 모바일이고, `md:`, `lg:` 등으로 큰 화면 스타일을 추가합니다
4. **다크모드** - `dark:` 접두사로 다크모드 스타일을 추가합니다
5. **자동완성 활용** - IDE에서 자동완성을 활용하면 더 빠르게 작성할 수 있습니다

---

## 🔗 유용한 리소스

- [Tailwind CSS 공식 문서](https://tailwindcss.com/docs)
- [Tailwind CSS Cheat Sheet](https://nerdcave.com/tailwind-cheat-sheet)
- [Tailwind UI](https://tailwindui.com/) - 프리미엄 컴포넌트 예시
