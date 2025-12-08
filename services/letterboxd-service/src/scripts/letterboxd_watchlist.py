import sys
import json
from bs4 import BeautifulSoup
import requests
import asyncio
from aiohttp import ClientSession

# ---------------------------------------
# Fetch a page asynchronously
# ---------------------------------------
async def fetch(url, session, input_data={}):
    async with session.get(url) as response:
        try:
            return await response.read(), input_data
        except:
            return None, None

# ---------------------------------------
# Parse a watchlist page → extract movie IDs
# ---------------------------------------
async def generate_watchlist_objects(response):
    soup = BeautifulSoup(response[0], "lxml")
    watchlist_movies = soup.find_all("li", {"class": "griditem"})

    movie_ids = []

    for watchlist_movie in watchlist_movies:
        rc = watchlist_movie.select_one("div.react-component")
        movie_id = rc.get("data-item-slug") if rc else None

        if movie_id:
            movie_ids.append(movie_id)

    return movie_ids

# ---------------------------------------
# Fetch user's watchlist across multiple pages
# ---------------------------------------
async def get_user_watchlist(username, num_pages):
    url = "https://letterboxd.com/{}/watchlist/page/{}/"

    async with ClientSession() as session:
        tasks = [
            asyncio.ensure_future(fetch(url.format(username, page + 1), session))
            for page in range(num_pages)
        ]

        scrape_responses = await asyncio.gather(*tasks)
        scrape_responses = [x for x in scrape_responses if x]

    # Parse page HTML
    tasks = [
        asyncio.ensure_future(generate_watchlist_objects(response))
        for response in scrape_responses
    ]

    parse_responses = await asyncio.gather(*tasks)
    return parse_responses

# ---------------------------------------
# Determine how many watchlist pages a user has
# ---------------------------------------
def get_page_count(username):
    url = f"https://letterboxd.com/{username}/watchlist/"
    r = requests.get(url)

    soup = BeautifulSoup(r.text, "lxml")
    body = soup.find("body")

    if "error" in body.get("class", []):
        return -1, None

    try:
        last_page = soup.find_all("li", {"class": "paginate-page"})[-1]
        num_pages = int(last_page.find("a").text.replace(",", ""))
        display_name = soup.find("h1", {"class": "title-3"}).text.strip()
    except Exception:
        num_pages = 1
        display_name = None

    return num_pages, display_name

# ---------------------------------------
# Used by FastAPI to fetch all movie IDs
# ---------------------------------------
def get_user_data(username):
    num_pages, _ = get_page_count(username)

    if num_pages == -1:
        return [], "user_not_found"

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    future = asyncio.ensure_future(get_user_watchlist(username, num_pages))
    loop.run_until_complete(future)

    # Flatten list
    user_watchlist = []
    for page in future.result():
        user_watchlist += page

    return user_watchlist

# ---------------------------------------
# CLI helper: get page count for multiple users
# ---------------------------------------
async def get_page_counts(usernames):
    url = "https://letterboxd.com/{}/watchlist/"
    tasks = []

    async with ClientSession() as session:
        for username in usernames:
            tasks.append(asyncio.ensure_future(fetch(url.format(username), session)))

        responses = await asyncio.gather(*tasks)
        responses = [x for x in responses if x]

        pages_count = []
        for response in responses:
            soup = BeautifulSoup(response[0], "lxml")
            try:
                page_link = soup.find_all("li", {"class": "paginate-page"})[-1]
                num_pages = int(page_link.find("a").text.replace(",", ""))
            except IndexError:
                num_pages = 1
            pages_count.append(num_pages)

        return pages_count

# ---------------------------------------
# CLI helper: fetch watchlists for multiple users
# ---------------------------------------
async def get_users_data(usernames, num_pages):
    tasks = [
        asyncio.ensure_future(get_user_watchlist(username, num_pages[i]))
        for i, username in enumerate(usernames)
    ]

    watchlists = []
    results = await asyncio.gather(*tasks)

    for pages in results:
        for page in pages:
            watchlists += page

    # Deduplicate
    watchlists = list(set(watchlists))
    return watchlists

# ---------------------------------------
# Standalone CLI execution
# ---------------------------------------
if __name__ == "__main__":
    usernames = sys.argv[1:]

    loop = asyncio.get_event_loop()

    # Detect number of pages per user
    future = asyncio.ensure_future(get_page_counts(usernames))
    loop.run_until_complete(future)
    page_counts = future.result()

    # Fetch the watchlists
    future = asyncio.ensure_future(get_users_data(usernames, page_counts))
    loop.run_until_complete(future)

    json_string = json.dumps(future.result())
    print(json_string, flush=True)
