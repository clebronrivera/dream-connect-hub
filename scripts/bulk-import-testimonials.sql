-- Bulk import of customer testimonials collected via Google Forms
-- Run this script to import pre-collected reviews that have already been curated
-- All reviews are inserted with is_approved=true since they've been vetted

INSERT INTO testimonials (
  customer_name,
  puppy_name,
  breed,
  message,
  city,
  state,
  is_approved,
  is_featured,
  created_at
) VALUES
-- Chris and Maggie - Shih Tzu from Fayetteville, NC (May 2024)
('Chris and Maggie', 'Candela', 'Shih Tzu', 'We are so happy with our little Candela. We met up with Yolanda and were able to see her dogs playing in the backyard with her kids. It was heartwarming and I knew I made the right choice. She provided a health verification, vaccine check, and even some toys for my new baby girl!', 'Fayetteville', 'NC', true, true, '2026-02-12 09:15:22+00'),

-- Robinson Family - Goldendoodle from Raleigh, NC (May 2024)
('Robinson Family', 'Paco', 'Goldendoodle', 'Getting our Goldendoodle Paco has literally been like the site says, a dream. It''s been two years and I''m glad that Yolanda reached out for a review. They sent me and my wife pictures and videos until he was ready to be picked up. Loved how friendly and social he was acting. He definitely developed to be a gift to us. Now that we''re expecting a baby girl, we''re excited for her to be with him. Thank you, Yolanda.', 'Raleigh', 'NC', true, true, '2026-05-18 11:20:45+00'),

-- Bill and Tina - Mini Poodle from Tampa, FL (March 2026)
('Bill and Tina', 'Sophie', 'Mini Poodle', 'Our Sophie is the smartest dog we have ever owned and trust me, we''ve owned three in the last thirty years. I appreciate the communication from the team. They provided a full health verification and vaccine check, plus some cute toys that Sophie still plays with.', 'Tampa', 'FL', true, false, '2026-03-10 16:05:10+00'),

-- Chris - Maltese from Fayetteville, NC (January 2025)
('Chris', 'Chispa', 'Maltese', 'El proceso fue muy profesional. Conocí a Yolanda en su residencia y fue una interacción muy fácil; ella nos hizo sentir muy cómodos. Nos llevamos a nuestra pequeña Chispa a casa. Gracias por contactarnos, Yolanda. Estoy feliz de poder decirte cuánta alegría nos ha traído Chispa.', 'Fayetteville', 'NC', true, false, '2026-02-12 14:45:33+00'),

-- Sarah Johnson - Mini Doodle from Jacksonville, FL (April 2024)
('Sarah Johnson', 'Mateo', 'Mini Doodle', 'A wonderful experience from start to finish. I inquired on the website and got a response very quickly, which was surprising. Within a couple days we had Mateo, the newest member of our family. We enjoyed Mateo, but unfortunately he passed due to an accident. However sad that is, we are excited to report that ironically we are getting our next dog from Yolanda and Carlos very soon. Thank you guys for connecting with me on my loss and helping me.', 'Jacksonville', 'FL', true, false, '2026-05-15 10:30:12+00'),

-- Lizzy - Goldendoodle from Raeford, NC (May 2024)
('Lizzy', 'Bella', 'Goldendoodle', 'I''m happy that Yolanda reached out to me and my wife for a review. After we retired and our kids got older, we felt we felt a need to get a dog that was smart enough to be trained because at our age we couldn''t get a dog that''s was too active or too rough and so I typed in Google and found this young lady''s website which I''ll say looks much better looks new and improved. I was hesitant at first because of so many scams and puppy mills out there and thought maybe a local or home breeder would be better and it was. I first visited to take a look at the dog before committing a deposit and I had all my questions answered. She took me out back and I was able to see her dogs running around. She shared that had the girls separate then the boys. And I was able to see how clean the space was. I''m so happy she was local and the drive was short. Once our baby Bella was ready we went to get her. The payment was easy and contract fair. Thank you!', 'Raeford', 'NC', true, true, '2026-05-19 08:55:01+00'),

-- Michael Chen - Shih Tzu from Gainesville, FL (December 2023)
('Michael Chen', NULL, 'Shih Tzu', 'The four-hour drive was well worth it! We met Carlos and he was so patient. We left with a health verification, vaccine records, and a bag of toys for our new baby girl. It''s rare to find breeders this dedicated.', 'Gainesville', 'FL', true, false, '2026-03-02 13:12:59+00'),

-- Marcos - Mini Poodle from Greensboro, NC (September 2022)
('Marcos', NULL, 'Mini Poodle', 'I stumbled on the website and was impressed by the transparency in price and process. Called the number and talked to Yolanda stayed on the phone with me for an hour. Our puppy is healthy, happy, and came with things that we needed for a good start. Gracias Yolanda.', 'Greensboro', 'NC', true, false, '2026-04-04 17:40:22+00'),

-- Tamie S. - Maltese from Melbourne, FL (May 2024)
('Tamie S.', NULL, 'Maltese', 'We drove from across state and it was the best decision. Yolanda and Carlos treat their dogs like family. The health verification gave us peace of mind, and the toys were such a sweet personal touch.', 'Melbourne', 'FL', true, true, '2026-05-05 12:00:00+00'),

-- Patricia Williams - Mini Doodle from Columbia, SC (July 2023)
('Patricia Williams', NULL, 'Mini Doodle', 'Professional interaction throughout. We appreciated the health verification and the fact that they are so reachable. Our little one is the perfect addition to our home.', 'Columbia', 'SC', true, false, '2026-02-28 15:25:31+00'),

-- David Martinez - Goldendoodle from Orlando, FL (January 2026)
('David Martinez', NULL, 'Goldendoodle', 'Met Yolanda at her home and saw the love she puts into this. It wasn''t just a transaction; it was a connection. She even sent us home with a vaccine check and toys for our girl.', 'Orlando', 'FL', true, false, '2026-02-02 11:11:11+00'),

-- Earl - Shih Tzu from Durham, NC (April 2023)
('Earl', NULL, 'Shih Tzu', 'After a long search, we found this local gem. Yolanda made the process feel personal and safe. Our baby girl is healthy and thriving thanks to the great start she had here.', 'Durham', 'NC', true, false, '2026-04-20 09:44:56+00'),

-- Claudia - Mini Poodle from Orlando, FL (December 2023)
('Claudia', 'Sofia', 'Mini Poodle', 'The communication was top-tier. Coordinated Carlos delivering the dog to Colorado, we meet in the airport and he gave us a folder with a lot of information about the dog and vaccinations and multi-state health certificate. Couldn''t believe the price and quality of our now 1 year old mini-poodle. I should add that Carlos made sure he sent us videos on how he was training and prompting Sofia. We followed the same commands and she caught on quick. Go potty, stop, and stay! It was the time they (his sister helped clarify a couple of things when he was busy).', 'Orlando', 'FL', true, false, '2026-03-12 18:22:14+00'),

-- Jennifer Lee - Goldendoodle from Denver, CO (October 2024)
('Jennifer Lee', NULL, 'Goldendoodle', 'A friend who lives in Orlando referred us to Yolanda and Carlos, and even from Colorado, the process was seamless. They coordinated everything. Our puppy arrived with a full health verification and his favorite toys!', 'Denver', 'CO', true, false, '2026-05-10 14:55:00+00'),

-- Anthony Garcia - Mini Doodle from Jersey City, NJ (March 2024)
('Anthony Garcia', NULL, 'Mini Doodle', 'I stumbled on the Dream Puppy''s Instagram account and was cutified by all the cuteness. I messaged Yolanda and she sounded so excited and was responsive loved her personality. I have to say that girl is perfect, although i am sure everyone says that. The bucket of goodies I got also came in clutch. Thank you!', 'Jersey City', 'NJ', true, true, '2026-04-15 07:18:09+00')

ON CONFLICT DO NOTHING;
