import sys
import json
from bs4 import BeautifulSoup
import requests
import asyncio
from aiohttp import ClientSession
import math

async def fetch(url, session, input_data={}):
    async with session.get(url) as response:
        try:
            return await response.read(), input_data
        except:
            return None, None


async def generate_tmdbid(response):
    # Parse letterboxd page response for each movie, use lxml parser for speed
    try:
        soup = BeautifulSoup(response[0], "lxml")
        tmdbid = soup.find("body", attrs={"class": "film"})["data-tmdb-id"]
    except:
        return ""
    return tmdbid

async def get_movies_data(movies):
    url = "https://letterboxd.com/film/{}"
    

    async with ClientSession() as session:
        tasks = []
        # Make a request for each ratings page and add to task queue
        for movie in movies:
            task = asyncio.ensure_future(
                fetch(url.format(movie), session)
            )
            tasks.append(task)

        # Gather all ratings page responses
        scrape_responses = await asyncio.gather(*tasks)
        scrape_responses = [x for x in scrape_responses if x]
    
    # Process each ratings page response, converting it into bulk upsert operations or output dicts
    tasks = []
    for response in scrape_responses:
        task = asyncio.ensure_future(generate_tmdbid(response))
        tasks.append(task)

    parse_responses = await asyncio.gather(*tasks)
    return parse_responses

def movies_data(movies):
    chunk_size = 50
    total_chunks = math.ceil(len(movies) / chunk_size)
    tmdb_ids = []
    for chunk_index in range(total_chunks): 
        #print("chunk index: ", chunk_index)
        start_index = chunk_size * chunk_index
        end_index = chunk_size * chunk_index + chunk_size
        movies_chunk = movies[start_index:end_index]    
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        future = asyncio.ensure_future(
            get_movies_data(
                movies_chunk,
            )
        )
        loop.run_until_complete(future)
        tmdb_ids += future.result()
    return tmdb_ids

if __name__ == "__main__":
    # # Define the string with correct JSON formatting
    # json_string = '["normal-people-2020", "infinity-pool", "rrr", "still-alice", "along-with-the-gods-the-two-worlds", "american-hustle", "we-need-to-talk-about-kevin", "eternals", "how-to-train-your-dragon-the-hidden-world", "garden-state", "waves-2019", "the-holiday", "in-bruges", "road-house-2024", "sunshine-2007", "what-comes-around-2022", "the-killer-2023", "return-to-seoul", "the-power-of-the-dog", "watchmen", "la-haine", "jojo-rabbit", "ralph-breaks-the-internet", "mortal-kombat-2021", "enchanted", "the-lego-batman-movie", "the-day-after-tomorrow", "a-bronx-tale", "dead-snow-2-red-vs-dead", "the-blind-side", "blade-runner-2049", "million-dollar-baby", "a-man-called-otto", "ant-man-and-the-wasp", "darkest-hour", "there-will-be-blood", "hamilton-2020", "apocalypse-now", "spotlight", "the-last-airbender", "creed-ii", "yesterday-2019", "lost-highway", "frances-ha", "the-final-girls", "monkey-man", "decision-to-leave", "belfast", "the-banshees-of-inisherin", "the-northman", "stockholm-2018", "cinderella-2015", "musica", "portrait-of-a-lady-on-fire", "edward-scissorhands", "the-big-short", "the-art-of-self-defense-2019", "bridge-to-terabithia", "top-gun-maverick", "are-you-there-god-its-me-margaret", "the-thing", "the-godfather", "plan-b-2021", "kiss-kiss-bang-bang-2005", "the-holy-mountain", "smile-2022", "the-devil-wears-prada", "jumanji-welcome-to-the-jungle", "the-age-of-adaline", "asteroid-city", "filth", "babylon-2022", "looper", "the-village", "columbus-2017", "21", "it-comes-at-night", "the-first-omen", "the-artist", "the-departed", "cha-cha-real-smooth", "wind-river-2017", "the-babadook", "zombieland-double-tap", "the-last-duel-2021", "the-switch", "joy-ride-2023", "the-lobster", "speak-no-evil-2022", "she-came-to-me", "colette-2018", "the-nun-2018", "neon-genesis-evangelion-the-end-of-evangelion", "atonement", "look-whos-back-2015", "emma-2020", "the-others", "evil-dead-rise", "on-chesil-beach", "kill-bill-vol-2", "the-king-of-staten-island", "finding-neverland", "leave-the-world-behind-2023", "cast-away", "28-days-later", "the-last-voyage-of-the-demeter", "blade-runner", "fallen-angels", "in-the-mood-for-love", "fantastic-beasts-the-crimes-of-grindelwald", "enola-holmes-2", "casino", "scream-2022", "all-quiet-on-the-western-front-2022", "the-12th-man", "elemental-2023", "argo", "walk-the-line", "the-disaster-artist", "once-upon-a-time-in-hollywood", "dont-look-up-2021", "ghost-in-the-shell-2017", "pearl-2022", "kingdom-of-heaven", "cherry-2021", "entergalactic", "abigail-2024", "finding-dory", "michael-clayton", "adventureland", "the-game", "the-help", "moonlight-2016", "fall-2022", "kill-bill-the-whole-bloody-affair", "run-2020", "captain-fantastic", "slumdog-millionaire", "moonrise-kingdom", "chungking-express", "the-zone-of-interest", "la-vie-en-rose", "the-artifice-girl", "turning-red", "us-2019", "three-identical-strangers", "never-let-me-go-2010", "schindlers-list", "doctor-strange-in-the-multiverse-of-madness", "independence-day", "lisa-frankenstein", "new-world", "damsel-2024", "madame-web", "blue-jasmine", "mad-god", "the-five-year-engagement", "escape-room-2019", "barry-lyndon", "im-thinking-of-ending-things", "fear-street-1666", "scream-vi", "paterson", "beau-is-afraid", "the-babysitter-killer-queen", "all-the-money-in-the-world", "marie-antoinette-2006", "promising-young-woman", "a-taxi-driver", "13-going-on-30", "knocked-up", "perfect-strangers-2016", "swiss-army-man", "the-green-mile", "rush-2013", "no-country-for-old-men", "the-talented-mr-ripley", "indiana-jones-and-the-dial-of-destiny", "knock-at-the-cabin", "hunger-2023", "black-hawk-down", "love-actually", "sin-city", "fresh-2022", "big-fish", "the-blair-witch-project", "dead-poets-society", "youth-2015", "mr-mrs-smith-2005", "no-one-will-save-you", "scream-4", "priscilla", "nobody-2021", "hot-rod", "gone-baby-gone", "hellraiser-2022", "malignant-2021", "phantom-thread", "insidious-the-red-door", "the-conjuring-the-devil-made-me-do-it", "anatomy-of-a-fall", "little-women-2019", "alien", "the-green-knight", "the-jungle-book-2016", "the-unforgivable", "afire", "if-beale-street-could-talk", "ant-man-and-the-wasp-quantumania", "the-curious-case-of-benjamin-button", "venom-2018", "warrior", "forgetting-sarah-marshall", "hundreds-of-beavers", "jaws", "aquaman-2018", "armageddon", "west-side-story-2021", "shershaah", "shaun-of-the-dead", "come-and-see", "into-the-wild", "the-master-2012", "the-boy-and-the-heron", "seven-psychopaths", "elvis-2022", "pride-prejudice", "missing-2023", "beautiful-boy-2018", "bridge-of-spies", "apollo-13", "revolutionary-road", "guillermo-del-toros-pinocchio", "scream-3", "taxi-driver", "memories-of-murder", "deepwater-horizon", "millers-girl", "carol-2015", "revenge-2017", "a-walk-to-remember", "the-town", "fear-street-1978", "the-hurt-locker", "then-came-you", "minority-report", "magnolia", "spirit-stallion-of-the-cimarron", "free-guy", "the-longest-yard-2005", "the-silence-of-the-lambs", "jerry-marge-go-large", "intolerable-cruelty", "zack-snyders-justice-league", "red-notice", "lemonade-mouth", "xy", "the-fabelmans", "nightmare-alley-2021", "mr-nobody", "women-talking", "logan-lucky", "climax-2018", "before-we-go", "the-shining", "princess-mononoke", "love-lies-bleeding-2024", "seven-pounds", "perfect-blue", "the-hateful-eight", "synecdoche-new-york", "match-point", "encanto", "death-at-a-funeral", "the-kings-speech", "when-we-first-met", "the-virgin-suicides", "nerve-2016", "mistress-america", "jennifers-body", "hustle-2022", "sick-of-myself", "crazy-heart", "under-the-silver-lake", "may-december", "the-tale-of-the-princess-kaguya", "valentines-day", "red-sparrow", "unbreakable", "prey-2022", "all-the-bright-places", "nimona-2023", "true-romance", "look-away", "men-2022", "shaolin-soccer", "deadpool-2", "moon", "alita-battle-angel", "scarface-1983"]'

    # # Parse the JSON string into a Python list
    # movies = json.loads(json_string)
    #print(movies)
    json_string = json.dumps(movies_data(sys.argv[1:]))
    print(json_string)
