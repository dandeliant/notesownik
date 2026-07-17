# 📓 Notesownik

**Twoja wizualna tablica do katalogowania notatek, plików, filmów, muzyki i kart pracy.**

Aplikacja webowa w stylu Padlet - polska, w pełni działająca offline dzięki PWA, bez konta i bez wysyłania danych na serwer. Wszystko zapisuje się lokalnie w Twojej przeglądarce.

🔗 **Live demo:** _(dodaj link po włączeniu GitHub Pages)_

---

## ✨ Główne funkcje

- 🗂️ **Wiele tablic** - każda z własnym URL do udostępniania
- 📌 **7 typów kart** - Notatki, Obrazy, Filmy (YouTube/Vimeo), Muzyka, Pliki, Karty pracy (PDF), Linki
- 🎨 **8 kolorów kart** + 6 motywów tablic
- 🖱️ **Drag & drop** - przeciągaj karty i całe kolumny
- 🧱 **3 układy** - Kolumny (kanban, domyślny), Swobodny (masonry), Siatka
- 🔍 **Wyszukiwarka, tagi i filtry kategorii**
- 🌙 **Tryb jasny / ciemny**
- 🔗 **Udostępnianie linkiem** (lokalnie lub z zakodowanymi danymi)
- 💾 **Eksport / Import JSON**
- 📱 **PWA** - instaluj jak aplikację, działa offline

---

## 🚀 Uruchomienie lokalne

Nie wymaga instalacji, buildów ani zależności. Wystarczy:

```bash
# Sklonuj repo
git clone https://github.com/dandeliant/notesownik.git
cd notesownik

# Otwórz w przeglądarce (dowolna z poniższych opcji):
# 1. Dwuklik na index.html
# 2. Prosty serwer HTTP:
python -m http.server 8000
# albo
npx serve .
```

Otwórz `http://localhost:8000` w przeglądarce.

> **Uwaga:** Service Worker (PWA) wymaga uruchomienia przez HTTP/HTTPS, nie `file://`. Do lokalnego testowania offline użyj serwera.

---

## 📂 Struktura projektu

```
notesownik/
├── index.html              # Landing + widok tablicy (routing hashem)
├── styles.css              # Wszystkie style
├── script.js               # Cała logika aplikacji
├── manifest.webmanifest    # Manifest PWA
├── sw.js                   # Service Worker (offline)
├── icon.svg                # Ikona aplikacji
├── icon-maskable.svg       # Ikona maskable (Android)
└── README.md
```

Brak bundlerów, brak node_modules. Czysty HTML/CSS/JS.

---

## 🎯 Skróty klawiszowe

| Skrót        | Akcja                       |
|--------------|-----------------------------|
| `/`          | Wyszukiwarka                |
| `Ctrl+N`     | Nowa karta / nowa tablica   |
| `Esc`        | Zamknij modal / lightbox    |
| `Enter`      | Zatwierdź tytuł kolumny/karty |

---

## 🔧 Technologie

- **Vanilla JavaScript** (ES6+, brak frameworków)
- **CSS Grid + Flexbox + CSS Variables**
- **HTML5 Drag & Drop API**
- **localStorage** (dane) + **Service Worker Cache API** (offline shell)
- **PWA** (Web App Manifest, Service Worker)
- Google Fonts: `Inter` + `Caveat`

---

## 📱 Instalacja jako aplikacja

Po otwarciu strony na urządzeniu wspierającym PWA:

- **Chrome/Edge** (Windows/Android): baner „Zainstaluj Notesownik" pojawi się automatycznie, albo kliknij ikonę instalacji w pasku adresu
- **Safari** (iOS): Udostępnij → „Dodaj do ekranu głównego"
- **Firefox** (Android): menu → „Zainstaluj"

Po instalacji Notesownik uruchamia się jak natywna aplikacja i działa całkowicie offline.

---

## 🌐 Wdrożenie na własną domenę

Aplikacja jest w 100% statyczna - hostuj gdzie chcesz:

- **GitHub Pages** (najszybciej)
- **Netlify** (`drag & drop` folderu)
- **Vercel**
- **Cloudflare Pages**
- Własny serwer nginx/Apache

---

## 🗺️ Roadmap

- [ ] Import z prawdziwego Padleta (parser HTML)
- [ ] Współpraca w czasie rzeczywistym (WebRTC lub Yjs)
- [ ] Konta użytkowników i synchronizacja (Supabase)
- [ ] AI - automatyczne tagowanie i podsumowania kart
- [ ] Eksport tablicy do PDF
- [ ] Biblioteka szablonów dla nauczycieli

---

## 📝 Licencja

MIT - używaj, modyfikuj, publikuj.

---

## 🙋 Autor

Stworzony jako polska alternatywa dla drogich narzędzi typu Padlet - dla nauczycieli, uczniów, projektantów i wszystkich, którzy chcą wizualnie porządkować wiedzę.
