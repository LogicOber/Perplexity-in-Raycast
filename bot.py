import discord
import asyncio
from dotenv import dotenv_values


class MyClient(discord.Client):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.event = asyncio.Event()  # create an Event object

    async def on_ready(self):
        print('Logged on as', self.user)

    async def on_message(self, message):
        # don't respond to ourselves
        if message.author == self.user:
            return
        
    async def on_message_edit(self, before, after):
        print("on_message_edit method started")
        if after.author.id == 1085343396173991946:
            for embed in after.embeds:
                embed_dict = embed.to_dict()  # convert the embed to a dictionary
                print(f"Embed dict: {embed_dict}")  # print the embed dict for debugging
                description_parts = embed_dict['description'].split('Then Please answer in Chinese:', 1)  # split the description at the user's question
                print(f"Description parts: {description_parts}")  # print the description parts for debugging
                self.answer = description_parts[1].strip()  # save the part of the description after the user's question
                print(f"🔥 Answer: {self.answer}")  # print the answer for debugging
                try:
                    with open('answer.txt', 'w', encoding="utf-8") as f:  # open the file in write mode
                        f.write(self.answer)  # write the answer to the file
                        print(f"Answer written to file: {self.answer}")  # print the answer for debugging
                except Exception as e:
                    print(f"Error writing to file: {e}")
            self.event.set()  # set the event to resume the send_question method

intents = discord.Intents.default()  # create intents object
intents.message_content = True
client = MyClient(intents=intents)

async def main():
    config = dotenv_values(".env")  # load .env file
    token = config["DISCORD_BOT_TOKEN"]
    task = asyncio.create_task(client.start(token))
    await task
loop = asyncio.get_event_loop()
loop.run_until_complete(main())