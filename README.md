# Leitwerk · SGL-Copilot

Interaktiver Demonstrator für das Integrationsseminar Wirtschaftsinformatik an der DHBW Stuttgart. Der Planungsstand startet am Montag, 23. November 2026. Alle Veranstaltungen, Personen und Zuordnungen sind fiktiv.

## Auf GitHub Pages starten

1. ZIP entpacken und den Inhalt in das Hauptverzeichnis eines GitHub-Repositories hochladen. Die Datei `index.html` liegt direkt neben `app.js`, `engine.js`, `style.css` und dem Ordner `assets`.
2. Unter **Settings → Pages** die Quelle **Deploy from a branch** wählen, den Branch mit den Dateien (z. B. `main`) und **/(root)** auswählen und speichern.
3. Nach dem Deployment die dort angezeigte Website öffnen.

Alle Pfade sind relativ. Bootstrap, Schrift und Icons sind enthalten. Lokal reicht ein statischer HTTP-Server im entpackten Verzeichnis, z. B. `python -m http.server 8000`. Anschließend `http://localhost:8000` öffnen.

## Ein Durchlauf für den Pitch

- In KW 48 überlappen sich am Dienstag „Bilanzierung“ und „Finanzierung“ zwischen 10 und 11 Uhr in A 201.
- „Konflikte prüfen“ zeigt betroffene Termine, Raum und Uhrzeit. „Lösung für ersten Konflikt suchen“ berechnet einen Ersatz. In den Beispieldaten kann „Finanzierung“ zur selben Zeit nach A 204 wechseln.
- „Vorschlag übernehmen“ aktualisiert Kalender und Kennzahlen. Für eine erneute Vorführung mit unverändertem Datensatz die Seite in einem frischen privaten Browserfenster öffnen.
- „Welche Räume sind am Dienstag um 10 Uhr frei?“ berechnet freie Räume für ein einstündiges Zeitfenster. Weitere Fragen sind „Welche Prüfungen stehen am Freitag an?“ und „Welche Lehrpersonen sind eingeplant?“.

## Funktionsweise

Der Copilot verwendet ein lokales, auf beschrifteten deutschen Beispielsätzen basierendes Modell zur Erkennung von fünf Frageabsichten. Ein Nächster-Nachbar-Klassifikator vergleicht gewichtete Zeichengruppen (TF-IDF und Kosinusähnlichkeit). Die Antwort entsteht aus den tatsächlichen Terminen der ausgewählten Woche. Fragen außerhalb des erlernten Aufgabenbereichs können falsch zugeordnet werden. Das System verwendet kein generatives Sprachmodell.

Bei der Konfliktauflösung koordiniert eine lokale Suchfunktion drei Ressourcenprüfungen für Raum, Kurs und Lehrperson. Sie untersucht Ersatzräume und Startzeiten in 15-Minuten-Schritten innerhalb derselben Arbeitswoche. Eine Kostenfunktion bevorzugt geringe zeitliche Änderungen und die Beibehaltung von Prüfungsterminen. Jeder Vorschlag gilt für ein einzelnes Konfliktpaar und benötigt eine Freigabe. Bei Änderungen wird der Wochenplan neu geprüft.

Die Demo berücksichtigt Verfügbarkeit anhand der eingetragenen Termine. Raumkapazität, Raumausstattung, individuelle Dienstzeiten und Anbindungen an Hochschulsysteme sind außerhalb des Modells. Terminänderungen bleiben im lokalen Speicher des jeweiligen Browsers. Es gibt keine gemeinsame Datenbank.

## Dateien

- `engine.js` enthält Beispieldaten, Klassifikator, Konfliktprüfung und Suche.
- `app.js` verbindet Kalender, Formulare, Freigaben und Assistent.
- `assets/` enthält Bootstrap 5.3.3, Lucide-Icons und Inter mit ihren Lizenzen.
