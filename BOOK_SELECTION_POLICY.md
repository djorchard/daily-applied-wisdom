# Daily Applied Wisdom book selection policy

## Purpose

Select one excellent book for each Daily Applied Wisdom lesson. A selected book must support three accurate, distinctive and useful ideas that can improve how the reader works, thinks or lives.

Software development is the centre of gravity. The wider scope deliberately includes career advancement, earning and finance, reasoning, memory, applied mathematics, game design, creativity, happiness, relationships and other sources of a better and more fulfilling life.

The library is not limited to business books and is not driven by bestseller lists, novelty or hype.

## Eligible books

Choose primarily rigorous nonfiction. Excellent biography, history, science, philosophy and narrative nonfiction are eligible when they contain transferable lessons.

Relevant subjects include:

- Software engineering, architecture, coding, testing, security, reliability, DevOps, data, AI-assisted engineering, technical debt and engineering practice
- Product development, user experience, engineering management and technical leadership
- Career strategy, getting a raise, finding a better job, interviewing, negotiation, communication, influence and earning power
- Systems thinking, reasoning, logic, psychology, decision-making and problem-solving
- Learning, memory and skill development
- Applied mathematics, statistics, probability, estimation and quantitative intuition
- Personal finance, investing and economics
- Computer-game design, interactive systems, player experience, balancing, emergence and creative technology
- Happiness, meaning, health, relationships, parenting, nature, gardening, music, history and other useful life topics

A non-software lesson should not be forced into an artificial software analogy. It must still offer credible value for the reader's work or life.

## Rolling 20-book portfolio

Give every book one primary track. Secondary topics do not satisfy another track's allocation.

| Primary track | Books in each rolling 20 | Share |
| --- | ---: | ---: |
| Software development, product, AI and technical leadership | 9 | 45% |
| Career, raises, better jobs, earning and communication | 2 | 10% |
| Thinking, systems and decision-making | 2 | 10% |
| Learning and memory | 1 | 5% |
| Applied mathematics and quantitative reasoning | 1 | 5% |
| Personal finance, investing and economics | 2 | 10% |
| Game design and interactive systems | 1 | 5% |
| Better life and high-quality wildcards | 2 | 10% |

At least one of the two better-life selections must directly address happiness, meaning, health, relationships or fulfilment. The other may come from science, history, biography, philosophy, nature, gardening, music or narrative nonfiction.

At least 12 of every 20 books must have a clear, credible application to software work, product delivery, technical leadership or career development. Direct software-centred books must remain between 8 and 10 unless the reader explicitly changes the focus.

For a library with fewer than 20 lessons, choose against the proportional deficit. This means currently missing tracks should begin appearing immediately rather than waiting for the twentieth lesson.

## Topic discovery randomizer

The machine-readable randomizer catalog is `content/topic-catalog.json`. It contains 29 eligible topic categories and their complete subtopic lists. The randomizer broadens where strong candidates are sought; it does not bypass the rolling-20 portfolio, repetition safeguards or quality gate.

The public discovery mix is grouped into eight readable families:

| Topic family | Discovery share | Included categories |
| --- | ---: | --- |
| Engineering, product and AI | 45% | Product Design & UX; Software Engineering; AI & Emerging Technology; Product Management; Automation & Productivity |
| Thinking, behaviour and learning | 15% | Systems Thinking; Decision Making & Rationality; Psychology; Human Behaviour; Problem Solving; Science of Learning |
| Strategy, leadership and organisations | 10% | Strategy; Leadership & Management; Workplace Politics & Organisations |
| Economics, finance and entrepreneurship | 10% | Economics; Finance & Investing; Entrepreneurship |
| Security, geopolitics and warfare | 5% | Cybersecurity & Adversarial Thinking; Military Strategy & Warfare; Geopolitics |
| History, science and futures | 5% | History; Science & Technology History; Future & Forecasting |
| Games, simulation and complex systems | 5% | Game Design; Simulation & Complex Systems |
| Creativity, philosophy and human stories | 5% | Music & Creativity; Philosophy; Biographies; Narrative Non-Fiction |

Family selection is weighted by the published shares. Category and subtopic selection are uniform within the selected family. Every category remains eligible, but software, product and AI retain the 45% centre of gravity.

Use `node tools/randomize-topic.mjs` for a fresh discovery prompt or `node tools/randomize-topic.mjs --seed YYYY-MM-DD` for a reproducible draw. Treat the result as a search direction. If it conflicts with the largest rolling-20 deficit, recent repetition or a stronger quality-gated candidate, the policy takes precedence.

## Selection procedure

1. Review the previous 19 lessons and identify the most underrepresented tracks.
2. Build a vetted candidate pool for the largest deficits. Use the topic randomizer to diversify discovery within those deficits, not to override them.
3. Apply the quality gate below to every candidate.
4. Select the strongest candidate. Randomise only among candidates of essentially equal quality.
5. Never use a weak book merely to fill an allocation; carry the missing track forward.
6. Do not publish more than two consecutive books from the same primary track.
7. Record the selected book's primary track and its nearest recent conceptual overlap.

## Quality gate

Score each factor from 0 to 2:

1. **Attribution confidence:** three ideas can be accurately traced to the book.
2. **Evidence integrity:** important claims can be checked and limitations represented honestly.
3. **Distinctiveness:** the ideas add more than familiar slogans or generic advice.
4. **Practical value:** at least one idea can change a real decision or action.
5. **Depth:** the material supports caveats, trade-offs and critical examination.
6. **Teachability:** three ideas can be explained, visualised, recalled and tested without padding.

A book must score at least 9 out of 12. It may not score zero for attribution confidence, evidence integrity or practical value.

Every selected book must:

- Sustain three genuinely distinct ideas without stretching one thesis into three labels
- Let the author's argument be separated clearly from the lesson's interpretation
- Support at least two reliable source notes, including authoritative material where available
- Produce a realistic experiment that takes no more than ten minutes
- Add something meaningfully different from recent lessons
- Use the most relevant current edition when revisions materially change the advice

Empirical, historical, psychological, mathematical and financial claims must be labelled strong, mixed, contested, outdated, context-dependent or primarily interpretive where that distinction matters.

## Subject-specific safeguards

- **Software and AI:** prefer durable engineering mechanisms over tool promotion. Label obsolete details and do not present one large company's practice as a universal rule.
- **Career and employment:** favour useful mechanisms over status theatre or manipulative tactics. Check current labour-market, employment or jurisdiction-specific claims when they affect the application.
- **Finance:** reject get-rich-quick schemes, guaranteed-return claims and market-timing promises. Do not turn a lesson into individual financial advice. Check current Australian tax, superannuation and regulatory claims against official sources.
- **Memory, psychology and wellbeing:** reject neuromyths, exaggerated brain-training transfer, simplistic dopamine stories, toxic positivity and unsupported universal prescriptions.
- **Mathematics:** prefer quantitative intuition that improves real estimation, risk or engineering decisions; avoid disconnected tricks and trivia.
- **Game design:** prefer systems, feedback, balance, emergence, level design, player experience and production lessons. Do not default to manipulative gamification.
- **Biography and narrative nonfiction:** treat a life or company as case evidence, not proof that copying the protagonist will reproduce the result.
- **Health and relationships:** distinguish general education from professional advice and avoid confident medical or therapeutic claims without strong support.

## Exclusions

Do not select:

- Shallow motivational books or collections of platitudes
- Pseudoscience or unsupported memory, maths, health or productivity claims
- Recycled self-help with no distinctive mechanism or evidence
- Books chosen mainly because they are popular, fashionable or controversial
- Anecdote-driven claims presented as universal causal rules
- Obsolete technical manuals unless their durable historical lesson remains useful
- Books whose central ideas cannot be reliably attributed or checked
- Polemics that provide heat but no durable, transferable insight

## Repetition and variety

- Do not repeat the same book, including another edition, within 365 days.
- Do not repeat the same author within 60 days unless the second work is substantively different and strongly justified.
- Do not repeat substantially the same central concept within 30 days.
- Do not schedule the same narrow subtopic on consecutive days.
- Revisit misunderstood ideas through spaced recall before selecting a near-duplicate book.
- A contrasting treatment may return after 60 days when the disagreement itself is educational.
- Mix recent and durable older works, authors, disciplines, countries and viewpoints. Recency never overrides quality.

## Personalisation

Prioritise applications relevant to the reader's software-development work, product ownership, technical leadership, stakeholders, career, finances, family and wider life.

Use only feedback that is actually available: explicit requests, answers to reinforcement questions, reported experiments, comments the selector can access, and statements that a lesson was too easy, difficult or especially useful. Do not interpret silence as dislike, and do not treat device-local reactions as available behavioural data.

An explicit new preference from the reader changes the mix immediately. After at least three consistent feedback signals, up to two slots may move between non-core tracks. The software-centred track must remain between 8 and 10 unless the reader explicitly changes that priority, and every named track must still appear at least once in each rolling 20.

When an answer shows strong understanding, increase conceptual difficulty. When an idea is misunderstood, revisit it later through a different example, question or book rather than repeating the same explanation.
