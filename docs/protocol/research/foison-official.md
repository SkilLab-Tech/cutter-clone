# Foison official-source research (C48 Pro Cam) - 2026-11-26
Model running this research: Sonnet 5.5 (claude-sonnet-5-5).
Scope: public, behavior-level info only. No SignMaster decompilation.
Legend: VERIFIED = read on the page; INFERRED = reasoned from adjacent evidence; NOT FOUND.

## 1. Does "C48 Pro Cam" exist? Specs
- Answer: NOT FOUND as a product. The Foison BR store pages I could read mention only C24 Pro Cam and Camy as camera models. The home page extract showed no C48 Pro Cam link. Store search (/search?q=c48) is blocked by robots; /collections/all errored, so absence is not conclusive. Confidence: NOT FOUND (weak negative).
  - https://loja.foison.com.br (home, fetched)
- A NON-camera "C-48" exists in the older C series: max media 1300 mm, max cut width 1220 mm, 17.5 kg, ships with stands. Series: max speed 600 mm/s, interfaces RS232C + USB, command languages HP-GL and DMPL, baud 57600/38400/28800/19200/14400/9600 (default 38400), 1 MB cache (4 MB optional), force 160 steps ~50-800 g (default f=30), speed default V=400, laser LED pointer toggle in menu. VERIFIED (for C-series generally, not Pro Cam).
  - https://manualmachine.com/foison/c30/22880846-user-manual
- C24 Pro Cam (the closest official camera sibling) specs from the store page: speed 800 mm/s; force 1000 g; usable width contour cutting 57.5 cm; simple cutting 61 cm; max media 72 cm; interfaces USB cable, pendrive, "Rede" (network; Wi-Fi not stated); compatible software "Cut+Arms, Pro, FoisonCut". VERIFIED.
  - https://loja.foison.com.br/plotter-de-recorte-profissional-foison-c24-pro-cam-multimark
  - INFERRED: a C48 Pro Cam would be a wider variant (~120 cm), but contour width, force, speed are unknown. Treat all as unconfirmed until read from the machine/the workshop's unit.
- Launch date: NOT FOUND.
- USB chip: community wiki for a (non-Pro) Foison C48 says CH340 USB-serial, COM port on Windows, driver CH34x_Install_Windows_v3_4.exe. VERIFIED for that unit, INFERRED for Pro Cam. https://wiki.teessidehackspace.org.uk/wiki/Equipment/Foison_C48_Vinyl_Cutter?oldid=551
- BUT the official Foison BR "Downloads importantes" page links an FTDI CDM21228 driver (https://ftdichip.com/Driver/CDM/CDM21228_Setup.zip) and SignMaster. So Pro Cam models sold in Brazil probably use FTDI, while older C-series use CH340. Chip on the Pro Cam: INFERRED (FTDI), must confirm via USB VID/PID (FTDI 0403, CH340 1A86) at the partner workshop. https://loja.foison.com.br/pages/downloads-importantes
- Command language: HP-GL (+ DMPL) for the C series: VERIFIED (manualmachine, manualslib extract p.31; wiki). For Pro Cam: INFERRED same; camera/ARMS commands unknown (NOT FOUND).
- Serial settings: 19200 8N1, XON/XOFF software flow control (community wiki, C48 non-cam); manual default 38400, must match the PC. VERIFIED (C series), INFERRED for Pro Cam.
- Buffer: manual does not give a size; "1 MB cache (4 MB optional)"; repeat data larger than buffer cannot be repeated. VERIFIED (C series).

## 2. Camera registration
- C24 Pro Cam page: camera reads marks on colored and translucent media; slogan "menor marca de registro do mercado". No mark size, count, layout, edge distance, or camera position published. VERIFIED that these are absent. Source: C24 Pro Cam page above.
- Software modes: page lists Cut+Arms, Pro, FoisonCut as compatible. What each does: NOT FOUND.
- Camera location (head), multimark, long-job layout: NOT FOUND officially. Name "Multimark" is in the C24 URL slug only.
- Camy 2 "faster mark reading" was reported by the home page extract; no camera detail. INFERRED only from fetch summary, not read directly.

## 3. Official manual / panel menus
- No official Pro Cam manual found. Closest: C-series manual (ManualsLib, 3 PDFs listed, 42-46 pages, includes Chinese one). Describes: Online/Offline keys, force +/- and speed +/- (online, applied at next point, 50 mm/s steps), origin set (resets X/Y to 0), Repeat (lost on power cycle), test square/rectangle, Us/Br menu (idle speed, baud), Xp/Yp scale, laser LED on/off, factory reset (hold origin 2 s). VERIFIED for C series.
  - https://www.manualslib.com/manual/1070249/Foison-C12.html
  - https://www.manualslib.com/products/Foison-C24-3769903.html (lists 3 manuals, section titles only)
  - https://manualmachine.com/foison/c30/22880846-user-manual
- Force/speed: set from the panel (also adjustable mid-job). Whether software HPGL VS/FS commands override them: NOT FOUND (HPGL FS/VS are standard, INFERRED likely honored).
- Pendrive jobs and contour/camera menus: NOT FOUND (C-series manual has no pendrive section).

## 4. FoisonCut
- Listed as compatible software on the C24 Pro Cam page only. Platform, vendor, protocol docs: NOT FOUND. Not on the downloads page. Web search returned only spam/aggregator pages. Confidence: NOT FOUND.
- The only downloads on the official page are SignMaster (https://signmaster.estore.software/downloads, not fetched: blocked) and the FTDI driver.

## 5. Support and downloads
- WhatsApp (21) 99751-5409 (contact page and footer; FAQ shows (21) 99036-6154 - discrepancy), tel (21) 3939-1722, contato@foison.com.br, Mon-Fri 9-18h, Rua Serrita 93 A, Duque de Caxias RJ. VERIFIED. https://loja.foison.com.br/pages/contato , /pages/faq
- Warranty 2 years: https://loja.foison.com.br/pages/faq
- Escola Foison (courses): https://escola-foison.memberkit.com.br/ (listed on home; not opened)
- Downloads: https://loja.foison.com.br/pages/downloads-importantes (SignMaster + FTDI only; no firmware or manuals).

## Pages tried with nothing or failed
- https://loja.foison.com.br/search?q=c48 (robots disallowed)
- https://loja.foison.com.br/collections/all (client error)
- https://loja.foison.com.br/plotter-de-recorte-profissional-foison-camy (server error twice)
- https://www.foison.com.br (permission not granted, not fetched)
- https://signmaster.estore.software/downloads (permission not answered, not fetched)
- Web searches for "C48 Pro Cam", "FoisonCut", "Cut+Arms", Foison YouTube: only marketplaces, Mimaki manuals, spam.
- Not attempted: foison.com (Shenzhen), YouTube channel pages, escola-foison, manuals.plus.

## Suggested next steps
1. Hardware evidence at the partner workshop: read USB VID/PID, serial params, and sniff what the factory software sends for a plain cut (Phase 0).
2. Ask Foison BR support for the C48 Pro Cam manual and mark spec.
3. Open C24 Pro Cam YouTube tutorials (watch, not decompile) for mark layout behavior.
