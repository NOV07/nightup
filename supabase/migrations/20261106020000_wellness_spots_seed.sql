-- Seed wellness spots. Όλα μπαίνουν unpublished και unverified. Οι συντεταγμένες
-- των 5 κεντρικών είναι προσεγγιστικές, τα υπόλοιπα περιμένουν pin από το admin.
insert into public.wellness_spots
  (slug, name, area, kind, description, best_time, has_bench, access_note, lat, lng, source_url)
values
('strefi-hill', 'Λόφος Στρέφη', 'Εξάρχεια', 'hill',
 'Θέα προς Ακρόπολη, Λυκαβηττό και, με καθαρό ουρανό, Πειραιά. Σχεδόν άδειος νωρίς το πρωί ή λίγο πριν δύσει ο ήλιος.',
 'sunset', true, 'Ανεβαίνεις από τα στενά των Εξαρχείων ή από τη Δεριγνύ.',
 37.9900, 23.7360, 'https://www.oneman.gr/onecity/urban/exi-simeia-stin-athina-gia-na-deis-dorean-tin-poli-apo-psila/'),

('philopappou-hill', 'Λόφος Φιλοπάππου / Πνύκα', 'Κουκάκι – Θησείο', 'hill',
 'Ηλιοβασίλεμα πάνω από την Πνύκα. Το πιο ήρεμο σημείο είναι πίσω από το μνημείο.',
 'sunset', null, 'Είσοδος από την Αποστόλου Παύλου.',
 37.9687, 23.7222, 'https://www.oneman.gr/onecity/urban/exi-simeia-stin-athina-gia-na-deis-dorean-tin-poli-apo-psila/'),

('anafiotika', 'Αναφιώτικα', 'Πλάκα', 'viewpoint',
 'Νησιώτικη βόλτα κάτω από τον Βράχο, με θέα από την Πλάκα ως τον Λυκαβηττό.',
 'day', null, null,
 37.9722, 23.7312, 'https://www.in2life.gr/delight/goingout/article/1005497/kai-oi-7-htan-yperohes-voltes-me-thea-sthn-athhna.html'),

('lycabettus', 'Λυκαβηττός', 'Κολωνάκι', 'hill',
 'Η πιο πανοραμική θέα της πόλης, από την Ακρόπολη ως τον Σαρωνικό. Το βράδυ φαίνονται τα φώτα της πόλης.',
 'sunset', null, 'Με τα πόδια από τη Δεξαμενή ή με το τελεφερίκ από το Κολωνάκι.',
 37.9819, 23.7433, 'https://www.oneman.gr/onecity/urban/exi-simeia-stin-athina-gia-na-deis-dorean-tin-poli-apo-psila/'),

('areios-pagos', 'Άρειος Πάγος', 'Ακρόπολη', 'hill',
 'Από τα πιο γνωστά σημεία για ηλιοβασίλεμα στο κέντρο, με περισσότερο κόσμο από τον Στρέφη.',
 'sunset', null, null,
 37.9715, 23.7243, 'https://www.travel.gr/experiences/51-simeia-idanika-gia-na-apolaysete-to-i/'),

('hymettus-analipsi', 'Πάρκο Ανάληψης (Προφήτης Ηλίας Υμηττού)', 'Υμηττός', 'park',
 'Ξέφωτο σαν μπαλκόνι με θέα προς την πόλη, μακριά από τη φασαρία.',
 'day', null, 'Μετρό ως Άγιο Δημήτριο ή Υμηττό και λίγο περπάτημα.',
 null, null, 'https://www.oneman.gr/onecity/urban/exi-simeia-stin-athina-gia-na-deis-dorean-tin-poli-apo-psila/'),

('tourkovounia', 'Τουρκοβούνια (Προφήτης Ηλίας / Αττικό Άλσος)', 'Τουρκοβούνια', 'hill',
 'Σχεδόν σφαιρική θέα στην Αθήνα και πολλή ησυχία. Στο Αττικό Άλσος υπάρχουν παγκάκια στη σκιά.',
 'sunset', true, null,
 null, null, 'https://www.oneman.gr/onecity/urban/exi-simeia-stin-athina-gia-na-deis-dorean-tin-poli-apo-psila/'),

('veikou-grove', 'Άλσος Βεΐκου', null, 'park',
 'Πανοραμική θέα της πόλης από την πλευρά του θεάτρου. Πιο urban παρά ρομαντική.',
 'day', null, null,
 null, null, 'https://www.oneman.gr/onecity/urban/exi-simeia-stin-athina-gia-na-deis-dorean-tin-poli-apo-psila/'),

('petroupoli-theatro-petras', 'Μονοπάτι πίσω από το Θέατρο Πέτρας', 'Πετρούπολη', 'hill',
 'Μονοπάτι μέσα από πευκοδάσος ως την κορυφή, με θέα σε όλη την Αθήνα.',
 'sunset', null, 'Με τα πόδια από το Θέατρο Πέτρας.',
 null, null, 'https://www.oneman.gr/onecity/urban/apodrasi-mesa-stin-poli-6-irema-meri-stin-athina/'),

('kastella', 'Καστέλλα', 'Πειραιάς', 'hill',
 'Θέα και στην πόλη και στη θάλασσα, με το λιμάνι.',
 'sunset', null, null,
 null, null, 'https://www.thecitizen.gr/330470/ta-pio-entyposiaka-simeia-theas-tis-athinas/'),

('penteli-observatory', 'Αστεροσκοπείο Πεντέλης', 'Πεντέλη', 'viewpoint',
 'Ηλιοβασίλεμα πάνω από την πόλη. Μακριά από το κέντρο, θέλει μετακίνηση.',
 'sunset', null, null,
 null, null, 'https://www.alfavita.gr/koinonia/480286_ta-omorfotera-iliobasilemata-tis-athinas-poy-na-ta-apolayseis'),

('petralona-dexameni', 'Δεξαμενή Πετραλώνων', 'Πετράλωνα', 'viewpoint',
 null, 'sunset', null, null,
 null, null, null),

('pantheon-aigaleo-slope', 'Πλαγιά Αιγάλεω πάνω από το Cine Πάνθεον', 'Αγία Βαρβάρα', 'hill',
 null, 'sunset', null, 'Πάνω από το θερινό Cine Πάνθεον, στους πρόποδες του Αιγάλεω.',
 null, null, null),

('merkouri-square', 'Πλατεία Μερκούρη', 'Άνω Πετράλωνα', 'square',
 'Γειτονιάτικη πλατεία με αίσθηση παλιάς Αθήνας. Δεν είναι σημείο ησυχίας: τα βράδια μαζεύεται κόσμος.',
 'all', null, null,
 null, null, 'https://www.athensvoice.gr/advertorial/103047/rantevoy-stin-plateia/')
on conflict (slug) do nothing;
