# EGX Learning Roadmap

> Living curriculum for learning technical analysis, tape/depth reading, risk management, market structure, and trade review.
> Updated as the strategy evolves.

## Current objective
Move from intuition/tips/top-gainers chasing to a repeatable process:
**Scan → Context → Setup → Trigger → Risk → Execution → Review.**

## Curriculum

### 1. Market structure
- Higher highs / higher lows
- Lower highs / lower lows
- Trend vs range
- Support/resistance as zones, not exact magic prices
- Breakout, failed breakout, reclaim, retest
- Gap-up / gap-and-fade / continuation

### 2. Candles and volume
- OHLC anatomy
- Why one candle is not a signal by itself
- Relative volume vs average volume
- Volume expansion on breakout
- Volume contraction during pullback
- Climax volume and exhaustion

### 3. Intraday structure
- 1m for execution and forensic review
- 5m for setup context
- Avoid treating 1m noise as prediction
- Opening drive, pullback, reclaim, higher-low continuation
- MFE and MAE after entry

### 4. Price Depth and Trades / Tape
- Depth = visible intent, not guaranteed liquidity
- Trades = actual execution
- Price response = verdict
- Bid/ask spread and slippage
- Absorption
- Replenishing bid/ask
- Why visible walls can cancel or move
- Avoid reading green/red prints as literal buyer/seller identity

### 5. Momentum trading
- Early continuation vs late chase
- Pilot position after first valid trigger
- Add only after confirmation
- Do not wait for “perfect” confirmation
- Do not buy a spike just because it is already +10% or +20%
- Partial profit + runner

### 6. Swing trading
- Entry near defined structure
- Invalidation before entry
- Risk/reward
- Re-entry after a stopped trade only when a new setup forms
- Avoid turning failed swings into accidental investments

### 7. Risk management
- Position size from EGP risk, not excitement
- Understand **R** as the amount intentionally risked if invalidation is hit
- Initial working baseline: 1R = 0.50% of equity
- Pilot = 0.5R; maximum daily loss = 2R
- Formula: shares = max EGP risk / risk per share
- Then apply a separate maximum-notional cap
- Add a slippage cushion for thin names
- Maximum risk per trade
- Maximum daily loss
- No revenge trades
- No averaging down without a new validated thesis
- Separate core capital, active trading capital, and cash reserve

### 8. Portfolio construction
- Core vs swing vs intraday
- Correlated EGX exposure
- Cash is a position
- Position concentration
- Protected cash vs deployable cash
- Protect winners; do not automatically sell winners and hold losers
- Repair/legacy positions should not become a permanent bucket

### 9. Behavioral review
Case studies from our own history:
- NAPR: slippage, stop hindsight, re-entry
- KORA: over-confirmation, depth vs tape, momentum continuation
- CRST: failed absorption/reclaim
- DTPP: revenge trade
- TALM: chasing a post-+20% climax
- MASR: buying a news gap near 52-week resistance
- ACTF: failed momentum continuation
- ETEL: pullback/reclaim entry and protecting a winner

## Learning method
For every concept:
1. Learn the definition.
2. Find it in one of our own trades.
3. Mark the exact chart/tape evidence.
4. Write the invalid interpretation.
5. Review the same pattern later using 1m/5m history.

## Source policy
Use a hierarchy:
1. EGX/company official disclosures and investor-relations pages
2. Exchange/broker market data
3. Primary financial statements
4. Reputable market-news sources
5. Educational references for general TA concepts

Do not use Facebook posts, rumors, or “market maker” stories as evidence.

## Initial external sources
- EGX official disclosures and market notices
- Company investor-relations pages
- CFA Institute material for portfolio/risk fundamentals
- CMT Association educational material for technical-analysis concepts
- Nasdaq/NYSE educational material for order-book and market-structure basics

Specific source links used in dated analyses should also be recorded in ANALYSIS_LOG.md.


# قاموس المبتدئ — Beginner Trading Glossary

> الهدف من الجزء ده إن أي كلمة أستخدمها في التحليل يكون لها معنى واضح عندك بالعربي والإنجليزي.
> هنعتبر ده المرجع الأساسي قبل ما نبني فوقه تحليل فني أو قراءة Depth/Tape.

## 1) Open / High / Low / Close — الافتتاح / أعلى سعر / أقل سعر / الإغلاق

**Open — سعر الافتتاح:** أول سعر حصل عليه تنفيذ فعلي في الجلسة أو الشمعة.

**High — أعلى سعر:** أعلى سعر وصل له السهم خلال الجلسة أو الشمعة.

**Low — أقل سعر:** أقل سعر وصل له السهم خلال الجلسة أو الشمعة.

**Close — سعر الإغلاق:** آخر سعر معتمد للجلسة بعد نهاية التداول. لما أقول:  
**"السهم قفل على 3.72"** = آخر سعر معتمد لليوم كان 3.72.

ليه الإغلاق مهم؟ لأن مكانه جوه مدى اليوم بيدينا فكرة عن آخر معركة بين المشترين والبائعين.  
مثال: سهم مداه 3.50–3.75 وقفل 3.73، ده معناه إن البائعين ماقدروش يرجعوه بعيد عن القمة قبل نهاية الجلسة. ده **مش ضمان** إنه هيطلع بكرة، لكنه أقوى من إنه يكون لمس 3.75 وبعدين قفل 3.52.

## 2) Session — الجلسة

**Trading Session** = يوم التداول من الافتتاح للإغلاق.

لما أقول **"آخر الجلسة"** أو **late session** أقصد الجزء الأخير من يوم التداول، وغالبًا بنراقبه لأنه يبين إذا كان الطلب استمر للنهاية ولا الحركة كانت مجرد اندفاعة مؤقتة.

## 3) Support — الدعم

**Support / Support Zone — دعم / منطقة دعم:** منطقة سعرية ظهر عندها قبل كده طلب كفاية يوقف النزول أو يعمل ارتداد.

ماينفعش نقول إن رقم واحد "سحري". الأفضل نفكر في **zone**.

مثال: لو السهم بينزل ناحية 3.59–3.60 وكل مرة يظهر شراء ويرجع فوقها، نقول إن دي **منطقة دعم محتملة**.

الدعم مش مضمون. لو اتكسر والسهم فضل تحته، يبقى الدعم فشل.

## 4) Resistance — المقاومة

**Resistance / Resistance Zone — مقاومة / منطقة مقاومة:** منطقة سعرية ظهر فيها عرض/بيع كفاية يوقف الصعود أو يرده لتحت.

مثال: لو السهم حاول 3.75 أكثر من مرة وكل مرة يرجع، نقول **3.75 مقاومة** لحد ما السوق يثبت العكس.

## 5) "السعر يمسك" — Price Holds

دي من أهم الكلمات اللي كنت بستخدمها.

لما أقول:  
**"3.70 لازم تمسك"** أو **"السعر يمسك فوق 3.70"**

مش معناها إن السهم يلمس 3.70 ثانية واحدة.

معناها إن السعر:
- يوصل للمنطقة،
- يحصل عليه بيع طبيعي،
- وماينهارش تحتها فورًا،
- ويفضل يتداول حوالينها أو فوقها،
- ويفضل كمان يعمل ارتداد منها.

يعني باختصار: **السوق اختبر المستوى، والمستوى لسه قادر يدافع عن نفسه.**

مثال:
- السهم ينزل 3.72 → 3.70 → 3.69 ثواني ويرجع 3.72: ممكن يكون hold مقبول حسب التنفيذات.
- السهم ينزل 3.70 → 3.66 → 3.63 ويفضل هناك: لأ، 3.70 ما مسكتش.

## 6) Confirmation — التأكيد

**Confirmation — تأكيد:** دليل إضافي يخلي السيناريو أقوى بعد أول إشارة.

التأكيد مش معناه نستنى لحد ما الحركة تخلص.

مثال:
- أول إشارة: 3.70 مسكت.
- تأكيد أول: رجع فوق 3.73.
- تأكيد أقوى: 3.75 اتكسرت والتنفيذات كملت فوقها بدل ما السعر يترد فورًا.

يعني **confirmation = السوق بدأ يثبت إن السيناريو اللي بنتوقعه بيتنفذ بالفعل**.

## 7) Trigger — نقطة التفعيل

**Trigger — Trigger Price / Entry Trigger:** الحدث اللي لو حصل، الخطة تسمح لنا نفكر في الدخول.

مثال:  
"لو 3.70 تمسك وبعدين 3.75 تتكسر بتداول حقيقي"  
هنا كسر 3.75 بعد التماسك هو الـ**trigger**.

الـtrigger مش معناه "اشتري بأي سعر". بعده بنبص على الـspread والـslippage والـinvalidation.

## 8) Breakout — اختراق مقاومة

**Breakout:** السعر يطلع فوق مقاومة مهمة.

لكن مجرد لمس فوق المستوى مش كفاية.

Breakout أقوى لما:
- يحصل فوق المستوى تنفيذ فعلي،
- السعر يفضل فوقه،
- والبيع اللي يظهر مايرجعوش بسرعة تحت المستوى.

مثال: مقاومة 3.75، والسهم يعدي 3.75 لـ3.77 و3.79 ويستمر = breakout مبدئي.

## 9) Failed Breakout — اختراق فاشل

**Failed Breakout:** السهم يعدي المقاومة، لكنه مايعرفش يثبت فوقها ويرجع بسرعة تحتها.

مثال:
3.75 مقاومة → السهم يطبع 3.78 → بعدها بدقائق يرجع 3.70.  
ده ممكن يكون **failed breakout**.

ودي من أخطر الحاجات في momentum trading لأن اللي اشتروا الاختراق بيتحبسوا فوق.

## 10) Reclaim — استرجاع مستوى

**Reclaim:** السهم كان تحت مستوى مهم، وبعدها رجع فوقه من جديد.

مثال:
السهم كسر 3.70 ونزل 3.65، بعدين رجع 3.71–3.73.  
نقول **reclaimed 3.70**.

لو بعد الاسترجاع فضل فوق المستوى، الإشارة تبقى أقوى.

## 11) Failed Reclaim — فشل استرجاع المستوى

السهم يحاول يرجع فوق مستوى فقده، لكنه يترد منه ويرجع لتحت.

مثال:
كسر 3.70 → نزل 3.64 → رجع 3.69/3.70 → ماقدرش يعدي → رجع 3.62.  
ده **failed reclaim**.

غالبًا ده معناه إن المستوى اتحول من support إلى resistance.

## 12) Retest — إعادة اختبار

**Retest:** السعر يكسر مستوى، وبعدها يرجع له يشوف هل المستوى هيفضل شغال لكن في الاتجاه الجديد.

مثال:
3.75 مقاومة → السهم يكسرها لـ3.82 → يرجع لـ3.75–3.77 → يلاقي شراء ويرتد.  
ده **successful retest**.

هنا المقاومة القديمة ممكن تتحول لدعم.

## 13) Pullback — تراجع مؤقت

**Pullback:** تراجع بعد حركة صاعدة، لكن من غير ما يبقى بالضرورة انعكاس كامل للاتجاه.

مثال:
سهم طلع 3.60 → 3.80، وبعدها رجع 3.72.  
ده ممكن يكون pullback طبيعي لو الـstructure لسه سليم.

مش كل نزول هو crash، ومش كل pullback فرصة شراء. لازم نشوف فين الدعم وهل السعر بيرجع يتماسك.

## 14) Higher High / Higher Low — قمة أعلى / قاع أعلى

**Higher High (HH):** قمة جديدة أعلى من القمة اللي قبلها.

**Higher Low (HL):** قاع جديد أعلى من القاع اللي قبله.

تتابع HH + HL عادة يدل على اتجاه صاعد.

مثال:
قاع 3.50 → قمة 3.70 → قاع 3.60 → قمة 3.80.  
ده structure صاعد.

## 15) Lower High / Lower Low — قمة أقل / قاع أقل

**Lower High (LH):** القمة الجديدة أقل من القمة السابقة.

**Lower Low (LL):** القاع الجديد أقل من القاع السابق.

تتابع LH + LL غالبًا يدل على اتجاه هابط.

## 16) Price Structure — هيكل حركة السعر

**Structure:** شكل حركة السعر من قمم وقيعان ومستويات.

لما أقول **"الـstructure اتكسر"** يعني النمط اللي كنا معتمدين عليه باظ.

مثال: كنا شايفين higher lows، وبعدها السهم كسر آخر higher low بوضوح. هنا الصعود بقى أضعف.

## 17) Invalidation — إلغاء فكرة الصفقة

**Invalidation Level:** السعر أو الحدث اللي لو حصل، يبقى السبب اللي دخلنا عشانه مبقاش موجود.

دي أهم من كلمة "stop" نفسها.

مثال:
دخلنا لأن 3.70 دعم واتعمل reclaim لـ3.75.  
لو السعر بعد الدخول كسر 3.60 وفضل تحتها، ممكن نقول إن الـsetup اتلغى.

الـinvalidation بيتحدد من الـstructure، وبعده نحسب حجم الصفقة.

## 18) Stop Loss — وقف الخسارة

**Stop Loss:** أمر أو قرار خروج لو الـinvalidation حصل.

الفرق:
- **Invalidation** = المنطق: "الصفقة بقت غلط."
- **Stop Loss** = التنفيذ: "أخرج هنا."

## 19) Pilot Position — مركز تجريبي صغير

**Pilot / Starter Position:** أول جزء صغير من الصفقة.

بدل ما ندخل بكل الكمية مرة واحدة، ناخد جزء صغير لما أول trigger يظهر.

ليه؟
عشان ندخل بدري نسبيًا، لكن لو الإشارة طلعت غلط تكون الخسارة صغيرة.

مثال:
عايزين في النهاية 1,000 سهم.  
ممكن نبدأ بـ400 سهم pilot، وبعد confirmation نزود.

## 20) Add — زيادة المركز

**Add / Add to Position:** شراء كمية إضافية بعد ما السوق يدينا دليل أقوى.

مش بنزود عشان السهم نزل علينا وخلاص.

القاعدة:
**نضيف على النجاح أو التأكيد، مش على الأمل.**

## 21) Partial / Partial Profit — بيع جزء من المركز

دي كلمة كنت بتسأل عنها.

**Partial:** تبيع جزء من الأسهم وتسيب الباقي.

مثال:
معاك 1,000 سهم.
السهم وصل لأول مقاومة.
تبيع 400 سهم = **take a partial**.
يفضل معاك 600.

ليه بنعمل كده؟
- نحجز جزء من الربح.
- نقلل الخطر.
- ونفضل موجودين لو السهم كمل.

## 22) Runner — الجزء اللي بنسيبه يكمل

**Runner:** الجزء المتبقي من الصفقة بعد ما أخذنا partial.

مثال:
اشتريت 1,000 سهم.
بعت 400 عند أول target.
الـ600 الباقيين = **runner**.

الهدف إنك لو السهم عمل حركة كبيرة بعد كده، ما تكونش خرجت بالكامل بدري.

يعني:
**Partial = أخدت جزء من الربح.**  
**Runner = الجزء اللي لسه راكب الحركة.**

## 23) Target — الهدف

**Target:** منطقة متوقعة ناخد عندها قرار: partial، خروج، أو مراقبة.

الـtarget مش وعد إن السعر هيوصل.

مثال:
دخول 3.75، والمقاومة التالية 3.90.  
ممكن نقول 3.88–3.90 **first target zone**.

## 24) Wall — حائط طلب أو عرض

**Bid Wall:** كمية شراء كبيرة ظاهرة في الـDepth عند سعر معين.

**Ask Wall / Sell Wall:** كمية بيع كبيرة ظاهرة عند سعر معين.

مثال:
عند 4.00 فيه 250,000 سهم معروضين للبيع، بينما المستويات اللي حواليه فيها 10–20 ألف فقط.  
ده ممكن نسميه **sell wall**.

لكن مهم جدًا:
**Wall مش ضمان.**  
الأوامر ممكن تتلغي قبل ما السعر يوصلها.

عشان كده:
**Depth = intent, not execution.**  
الـDepth بيدينا نية ظاهرة، لكن الـTrades بتقولنا إيه اللي اتنفذ فعليًا.

## 25) Bid — أعلى سعر مشتري

**Bid:** أعلى سعر موجود عليه حد عايز يشتري.

لو Highest Bid = 3.71، ده معناه إن أعلى طلب شراء ظاهر حاليًا 3.71.

## 26) Ask — أقل سعر بائع

**Ask:** أقل سعر موجود عليه حد عايز يبيع.

لو Lowest Ask = 3.73، ده معناه إن أرخص عرض بيع ظاهر 3.73.

## 27) Spread — الفرق بين الـBid والـAsk

**Spread = Ask - Bid**

مثال:
Bid = 3.71  
Ask = 3.73  
Spread = 0.02

كل ما الـspread أكبر، الدخول والخروج ممكن يبقوا أغلى وأصعب.

## 28) Price Depth / Order Book — دفتر الطلبات

**Depth / Order Book:** قائمة أوامر الشراء والبيع المعلقة عند أسعار مختلفة.

هي بتورينا:
- كام سهم مطلوب عند كل سعر،
- كام سهم معروض للبيع،
- وعدد الأوامر.

لكنها لا تخبرنا أكيد مين هينفذ ومين هيلغي.

## 29) Trades / Tape — التنفيذات الفعلية

**Trades / Tape:** الصفقات اللي حصلت فعلًا.

دي أهم من الـDepth لما الاتنين يختلفوا.

لو فيه wall شراء كبير ظاهر لكن البياعين بيفضلوا يضربوا عليه والسعر ينزل، يبقى الحائط مش قادر يحمي المستوى.

## 30) Absorption — امتصاص البيع أو الشراء

**Absorption:** أوامر هجومية كتير تضرب مستوى، لكن السعر مايكملش في نفس الاتجاه لأن طرف تاني بيمتص الكمية.

مثال في الشراء:
بائعين بيبيعوا كميات كبيرة على 3.60، لكن كل البيع بيتنفذ والسعر مش قادر ينزل 3.59.  
ممكن يكون فيه **buy-side absorption**.

لكن التأكيد الحقيقي يحصل لما السعر بعدها يبدأ يطلع.

## 31) Supply — العرض

**Supply:** ضغط البيع الموجود أو المتوقع عند منطقة سعرية.

لما أقول **"في supply عند 3.90"** يعني ظهر قبل كده بيع أو أوامر بيع كثيرة هناك، فممكن الصعود يواجه مقاومة.

## 32) Demand — الطلب

**Demand:** ضغط الشراء الموجود أو المتوقع عند منطقة سعرية.

منطقة فيها طلب قوي ممكن تعمل support، لكن لازم نشوف التنفيذ والسعر.

## 33) Volume — حجم التداول

**Volume:** عدد الأسهم اللي اتداولت خلال فترة.

Volume عالي = مشاركة كبيرة.
لكن لوحده لا يقول صعود أو هبوط.

الحجم لازم يتقرأ مع السعر:
- سعر بيطلع + volume بيزيد = مشاركة قوية في الصعود.
- سعر بينهار + volume ضخم = بيع قوي أو capitulation، حسب الاستجابة بعده.

## 34) Average Volume — متوسط حجم التداول

**Average Volume:** متوسط حجم التداول على عدد سابق من الجلسات.

بنقارنه بحجم اليوم عشان نعرف هل الاهتمام طبيعي ولا استثنائي.

## 35) Relative Volume / RVOL — الحجم النسبي

**RVOL:** حجم اليوم مقارنة بالمعتاد.

مثال:
Average Volume = 1m سهم.  
اليوم Volume = 3m.  
يبقى تقريبًا 3x average.

ده معناه اهتمام أعلى من المعتاد، لكن مش buy signal لوحده.

## 36) Momentum — الزخم

**Momentum:** سرعة وقوة حركة السعر في اتجاه معين.

سهم بيكسر مستويات بسرعة ومعاه volume وتنفيذات قوية عنده momentum.

Momentum ممكن يختفي فجأة، لذلك لازم يبقى عندنا invalidation.

## 37) Catalyst — محفز

**Catalyst:** خبر أو حدث ممكن يغير اهتمام السوق بالسهم.

أمثلة:
- نتائج أعمال
- استحواذ
- زيادة رأس مال
- عقد كبير
- توزيعات
- إدراج في مؤشر

الـcatalyst بيشرح **ليه الناس مهتمة**، لكنه مش معناه إن أي سعر مناسب للشراء.

## 38) Gap Up / Gap Down — فجوة سعرية

**Gap Up:** السهم يفتح أعلى بوضوح من إغلاق أمس.

**Gap Down:** يفتح أقل بوضوح من إغلاق أمس.

مثال:
قفل أمس 3.70 وفتح اليوم 3.95 = gap up.

الـgap ممكن يكمل أو يتباع عليه، لذلك ما نطاردوش تلقائيًا.

## 39) Chase / Chasing — مطاردة السعر

**Chasing:** تدخل بعد ما السهم جرى بعيد بسرعة، غالبًا بسبب FOMO، من غير setup نظيف.

مثال:
كان trigger عند 3.75، وإنت اترددت، السهم وصل 4.10، فتدخل هناك لمجرد إنك خايف يفوتك.

ده chasing.

## 40) FOMO — الخوف من فوات الفرصة

**Fear Of Missing Out:** تدخل لأنك خايف السهم يطلع من غيرك، مش لأن الخطة اتحققت.

ده من أكتر أسباب الشراء المتأخر.

## 41) Slippage — الانزلاق السعري

**Slippage:** الفرق بين السعر اللي كنت متوقع تنفذ عليه والسعر اللي اتنفذت عليه فعلًا.

مثال:
شايف Ask = 44.30 وضغطت Market Buy، لكن الكمية قليلة واتنفذت في الآخر بمتوسط 44.90.  
الفرق ده slippage.

## 42) Liquidity — السيولة

**Liquidity:** مدى سهولة دخول وخروج كمية من غير ما تحرك السعر عليك بقوة.

سهم فيه أوامر وتنفيذات كثيرة وspread صغير غالبًا أكثر سيولة من سهم book بتاعه فاضي وspread واسع.

## 43) Market Order — أمر سوق

**Market Order:** "نفذ لي دلوقتي بأفضل الأسعار المتاحة."

مميزته السرعة.  
عيبه إن السعر مش مضمون، وممكن ياخدك مستويات كتير في سهم قليل السيولة.

## 44) Limit Order — أمر محدد السعر

**Limit Order:** "اشتري لحد أقصى السعر ده" أو "بيع من السعر ده فأعلى."

مثال:
Limit Buy 3.75 = مش هتشتري بأعلى من 3.75.

في الأسهم السريعة أو قليلة السيولة، ده غالبًا أأمن من Market Order.

## 45) De-risk — تقليل المخاطرة

**De-risk:** نقلل حجم المركز بدل ما ناخد قرار كل شيء أو لا شيء.

مثال:
معاك 1,000 سهم وسيناريو السهم ضعف.
تبيع 500 وتسيب 500.
إنت كده **de-risked**.

## 46) Breakeven — نقطة التعادل

**Breakeven:** السعر اللي عنده مكسبك وخسارتك تقريبًا صفر بعد حساب الرسوم.

مش لازم نستنى breakeven عشان نخرج من صفقة باظت. السوق مش عارف متوسطك أصلًا.

## 47) Day Trade — صفقة يومية

**Day Trade:** دخول وخروج غالبًا في نفس الجلسة، والاعتماد الأكبر على الحركة اللحظية والـtape والـintraday structure.

## 48) Swing Trade — صفقة سوينج

**Swing Trade:** صفقة بنحتفظ بيها أيام أو أسابيع عشان نمسك حركة أكبر.

هنا بنستخدم structure أوسع، catalysts، support/resistance، ومش بنتوتر من كل حركة 1m.

## 49) Core Position — مركز أساسي

**Core:** مركز بنعتبره جزء أساسي من المحفظة لسبب متوسط/طويل الأجل، مش عشان حركة يوم واحد.

ده لا يعني "أمسك للأبد". لو الـthesis الأساسية اتغيرت، نعيد التقييم.

## 50) Speculative / Active Position — مركز مضاربي / نشط

مركز هدفه الاستفادة من حركة أو momentum أو event، ومحتاج إدارة ومخاطرة أشد من الـcore.

## 51) Setup — نموذج الصفقة

**Setup:** مجموعة شروط لازم تجتمع قبل ما نفكر في الدخول.

مثال:
- سهم عليه relative volume
- support واضح
- pullback مسك
- reclaim
- spread مناسب
- invalidation قريب

دي كلها مع بعض ممكن تكون setup.

## 52) Entry — الدخول

**Entry:** السعر/المنطقة اللي اشترينا عندها.

Entry كويس مش معناه أقل سعر في اليوم؛ معناه سعر يخليك تعرف بوضوح أنت غلط إمتى.

## 53) Exit — الخروج

**Exit:** بيع المركز كله أو جزء منه.

الخروج ممكن يكون:
- Stop
- Partial
- Target
- Failed setup
- End-of-day decision

## 54) Price Response — رد فعل السعر

دي كلمة مهمة جدًا.

**Price Response:** اللي السعر عمله بعد ما حصل تنفيذ أو لمس مستوى.

مثال:
فيه 500k bid عند 3.60.
البياعين ضربوه.
لو السعر فضل 3.60 ورجع 3.65 → response قوي.
لو وقع 3.55 → response ضعيف.

عشان كده القاعدة:
**Depth = intent. Trades = execution. Price response = verdict.**  
**الـDepth نية ظاهرة، الـTrades تنفيذ، ورد فعل السعر هو الحكم.**

## 55) "السعر يتأكد" — What I mean by “confirmed price”

أنا من هنا ورايح هبطل أقول لك كلمة **"اتأكد"** لوحدها.

هحدد نوع التأكيد:
- **Hold confirmation:** المستوى اتاختبر وماانهارش.
- **Reclaim confirmation:** السعر رجع فوق مستوى فقده.
- **Breakout confirmation:** المقاومة اتكسرت والتداول استمر فوقها.
- **Volume confirmation:** الحركة حصلت مع مشاركة أكبر من المعتاد.
- **Tape confirmation:** التنفيذات بتدفع السعر فعلًا بدل ما تتامتص من غير تقدم.

مفيش حاجة اسمها "السعر بقى مضمون". التأكيد معناه **احتمال السيناريو اتحسن، مش بقى يقين**.

## 56) "حائط اتاكل" — Wall got eaten

لو عندنا Ask Wall مثلًا 100,000 سهم عند 3.80، وبنشوف executions بتتم على 3.80 والكمية المعروضة تقل تدريجيًا لحد ما تختفي **من غير ما السعر يترفض لتحت**، نقول الحائط **اتاكل / got absorbed or consumed**.

أما لو الحائط اختفى فجأة من غير executions، ممكن يكون صاحبه **لغى الأمر**. ودي مش نفس الحاجة خالص.

## 57) "السهم قفل قوي" — Strong Close

مش مصطلح رسمي برقم ثابت، لكنه وصف.

لما أقول **Strong Close** أقصد غالبًا:
- الإغلاق قريب من أعلى اليوم،
- والسهم ما رجعش أغلب مكاسبه قبل النهاية،
- ويفضل كمان آخر الحركة يكون فيها طلب أو volume محترم.

لكن حتى strong close محتاج جلسة جديدة تثبت الاستمرار.

## 58) "السهم قفل ضعيف" — Weak Close

غالبًا:
- السهم كان طالع جامد،
- وبعدها رجع معظم الحركة،
- وقفل قريب من low أو الجزء السفلي من مدى اليوم.

ده بيقول إن المشترين فقدوا السيطرة نسبيًا قبل الإغلاق.

## 59) Closing Auction / Closing Prints — مزاد الإغلاق / تنفيذات الإغلاق

في آخر الجلسة ممكن تظهر تنفيذات كبيرة مرتبطة بآلية الإغلاق.

وجود volume ضخم في آخر دقيقة مهم، لكن ماينفعش لوحده نقول "تجميع". لازم نشوف:
- السعر النهائي،
- هل اتماسك بعد التنفيذات،
- والجلسة التالية بتفتح إزاي.

## 60) لما أقول "نستنى" — What “wait” should mean

من هنا ورايح كلمة **"نستنى"** لازم يكون وراها شرط واضح.

مش:
"نستنى نشوف."

لكن:
"نستنى 3.70 تتختبر؛ لو مسكت والسعر رجع فوق 3.75 بتداول حقيقي، يبقى عندنا trigger. لو 3.60 اتكسرت، السيناريو يتلغي."

يعني الانتظار له **حدث محدد**، مش انتظار مفتوح لحد ما الفرصة تضيع.

---

## مثال كامل بلغة بسيطة

لو قلت لك:

> "CRST لو 3.70 تمسك وبعدها 3.75 تتكسر، ناخد pilot. عند 3.90 ناخد partial ونسيب runner. لو 3.60 اتكسرت يبقى invalidation."

ترجمتها بالعربي البسيط:

السهم لازم ينزل ناحية 3.70 ويبين إن البيع مش قادر يكسره بسهولة. بعد كده لو المشترين قدروا يرفعوه فوق 3.75 ويستمر التداول فوقها، نبدأ بكمية صغيرة. لو وصل قرب 3.90 نبيع جزء ونأمن ربح، ونسيب باقي الأسهم تكمل لو الحركة قوية. لو بدل كده السعر وقع تحت 3.60 وفشل يرجع فوقها، يبقى السبب اللي دخلنا عشانه باظ ونخرج حسب الخطة.

---

## قاعدة التواصل بيننا من الآن

في أي تحليل حي، كل مصطلح جديد لازم أول مرة يظهر أكتبه بالشكل ده:

**Reclaim (استرجاع مستوى):** السعر كان تحت المستوى ورجع فوقه.

ولو قلت كلمة زي **hold / confirmation / partial / runner / wall / invalidation** هربطها مباشرة بسعر أو مثال من السهم اللي بنتابعه، بدل ما أفترض إن معناها معروف.
