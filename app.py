import os
import requests
import time
import sys


# <@1085343396173991946> is the number of PerplexityAI bot
def send_question(question, url, auth):
    msg = {
        # You can edit the prompt after {question}.
        'content': f'<@1085343396173991946> {question} . You should search and answer very detailed and give long answer. Then Please answer in Chinese:'  # add user input to the message
    }
    headers = {'authorization': auth}
    requests.post(url, headers=headers, data=msg)

def get_answer(previous_answer):
    while True:  # keep looping
        if os.path.exists('answer.txt'):
            with open('answer.txt', 'r') as f:
                answer = f.read()
                if answer != previous_answer:
                    return answer
        time.sleep(2)

question = sys.argv[1] if len(sys.argv) > 1 else "What is the meaning of life?"
url = sys.argv[2] if len(sys.argv) > 2 else None
auth = sys.argv[3] if len(sys.argv) > 3 else None

previous_answer = None
if os.path.exists('answer.txt'):
    with open('answer.txt', 'r') as f:
        previous_answer = f.read()
else:
    with open('answer.txt', 'w') as f:
        f.write('')
    previous_answer = ''

send_question(question, url, auth)
time.sleep(7)
answer = get_answer(previous_answer)
print(answer)