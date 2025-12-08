import sys
import json
import random
from bs4 import BeautifulSoup
import requests
import asyncio
from aiohttp import ClientSession

async def fetch(url, session, input_data={}):
    async with session.get(url) as response:
        try:
            return await response.read(), input_data
        except:
            return None, None


async def generate_movies_objects(response):
    soup = BeautifulSoup(response[0], "lxml")

    # Letterboxd rating pages now use <li class="griditem">
    movie_items = soup.find_all("li", {"class": "griditem"})

    movies = []

    for item in movie_items:
        # Get movie slug
        rc = item.select_one("div.react-component")
        movie_id = rc.get("data-item-slug") if rc else None
        if not movie_id:
            continue

        # Extract rating: look for <span class="rating rated-8">
        rating_span = item.find("span", class_="rating")
        rating_val = 0

        if rating_span:
            classes = rating_span.get("class", [])
            rated = next((c for c in classes if c.startswith("rated-")), None)
            if rated:
                numeric = int(rated.split("-")[-1])  # rated-8 → 8
                rating_val = numeric / 2             # Convert to 0–5 scale

        movies.append({
            "movie_id": movie_id,
            "rating": rating_val
        })

    return movies


async def get_user_movies(username, num_pages=None):
    url = "https://letterboxd.com/{}/films/page/{}/"

    async with ClientSession() as session:
        tasks = []
        # Make a request for each ratings page and add to task queue
        for i in range(num_pages):
            task = asyncio.ensure_future(
                fetch(url.format(username, i + 1), session, {"username": username})
            )
            tasks.append(task)

        # Gather all ratings page responses
        scrape_responses = await asyncio.gather(*tasks)
        scrape_responses = [x for x in scrape_responses if x]
    
    # Process each ratings page response, converting it into bulk upsert operations or output dicts
    tasks = []
    for response in scrape_responses:
        task = asyncio.ensure_future(generate_movies_objects(response))
        tasks.append(task)

    parse_responses = await asyncio.gather(*tasks)

    return parse_responses

def get_user_data(username):
    num_pages, display_name = get_page_count(username)
    if num_pages == -1:
        return [], "user_not_found"
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    future = asyncio.ensure_future(
        get_user_movies(
            username,
            num_pages=num_pages
        )
    )
    loop.run_until_complete(future)

    user_watchlist = []
    for page in future.result():
        user_watchlist += page
    return user_watchlist


def get_page_count(username):
    url = "https://letterboxd.com/{}/watchlist/"
    r = requests.get(url.format(username))

    soup = BeautifulSoup(r.text, "lxml")

    body = soup.find("body")
    if "error" in body["class"]:
        return -1, None

    try:
        page_link = soup.findAll("li", attrs={"class", "paginate-page"})[-1]
        num_pages = int(page_link.find("a").text.replace(",", ""))
        display_name = (
            body.find("section", attrs={"class": "profile-header"})
            .find("h1", attrs={"class": "title-3"})
            .text.strip()
        )
    except IndexError:
        num_pages = 1
        display_name = None
    return num_pages, display_name


async def get_users_data(usernames, num_pages):
    tasks = []
    # For a given chunk, scrape each user's ratings and form an array of database upsert operations
    for i, username in enumerate(usernames):
        # print((chunk_size*chunk_index)+i, username)
        task = asyncio.ensure_future(
            get_user_movies(
                username, num_pages=num_pages[i]
            )
        )
        tasks.append(task)

    # Gather all ratings page responses, concatenate all db upsert operatons for use in a bulk write
    watchlists = []
    user_responses = await asyncio.gather(*tasks)
    for response in user_responses:
        for page in response:
            watchlists += page
    

    return watchlists



async def get_page_counts(usernames):
    url = "https://letterboxd.com/{}/films/"
    tasks = []

    async with ClientSession() as session:
        for username in usernames:
            task = asyncio.ensure_future(
                fetch(url.format(username), session)
            )
            tasks.append(task)

        responses = await asyncio.gather(*tasks)
        responses = [x for x in responses if x]

        pages_count = []
        for i, response in enumerate(responses):
            soup = BeautifulSoup(response[0], "lxml")
            try:
                page_link = soup.findAll("li", attrs={"class", "paginate-page"})[-1]
                num_pages = int(page_link.find("a").text.replace(",", ""))
            except IndexError:
                num_pages = 1

            pages_count.append(num_pages)

        return pages_count


if __name__ == "__main__":

    usernames = sys.argv[1:]

    loop = asyncio.get_event_loop()

    # Find number of ratings pages for each user and add to their Mongo document (note: max of 128 scrapable pages)
    future = asyncio.ensure_future(get_page_counts(usernames))
    # future = asyncio.ensure_future(get_page_counts([], users))
    loop.run_until_complete(future)

    # Find and store ratings for each user
    future = asyncio.ensure_future(get_users_data(usernames, future.result()))
    # future = asyncio.ensure_future(get_ratings(["samlearner"], users, db))
    loop.run_until_complete(future)

    json_string = json.dumps(future.result())
    print(json_string, flush=True)
