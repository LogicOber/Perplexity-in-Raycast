import { PythonShell } from 'python-shell';
import { useEffect, useState } from "react";
import { Action, ActionPanel, List, Detail, LocalStorage, getPreferenceValues, Toast, showToast, useNavigation, Icon, Color } from "@raycast/api";
import fs from 'fs';
import util from 'util';

interface Preferences {
  discordUrl: string;
  discordAuth: string;
}

const { discordUrl: url, discordAuth: auth } = getPreferenceValues<Preferences>();

const readFile = util.promisify(fs.readFile);

async function send_question(question: string) {
  const options = {
    pythonPath: 'venv/bin/python', // Modify your Python path here.
    args: [question, url, auth],
    env: process.env
  };

  try {
    await PythonShell.run('app.py', options);
    console.log('finished');
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error(err.message);
    }
  }
}

function AnswerView({ question, setItems }: { question: string, setItems: React.Dispatch<React.SetStateAction<{ question: string; answer: string }[]>> }) {
  const [hasNewAnswer, setHasNewAnswer] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function get_answer(question: string, setLoading = true): Promise<string | null> {
    if (setLoading) {
      setIsLoading(true);
    }
  
    let hasReadNewAnswer = false;
  
    return new Promise((resolve, reject) => {
      const filePath = 'answer.txt';
      fs.watchFile(filePath, async (curr, prev) => {
        if (curr.mtime !== prev.mtime && !hasReadNewAnswer) {
          try {
            const answer = await readFile(filePath, 'utf8');
            console.log('The file content has changed, successfully read the new content:', answer);
            setHasNewAnswer(true);
            hasReadNewAnswer = true;
            if (setLoading) {
              setIsLoading(false);
            }
            // save the Q&A
            const savedQuestionsAndAnswers = JSON.parse(await LocalStorage.getItem<LocalStorage.Value>("questionsAndAnswers") as string || "{}") as { [question: string]: string };
            const timestamp = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/:/g, '-').replace(/\//g, '-'); // Change the timestamp format here(If U need)
            const uniqueQuestion = `${question}    ----    ${timestamp}`; // Add timestamp as a unique identifier
            savedQuestionsAndAnswers[uniqueQuestion] = answer;
            await LocalStorage.setItem("questionsAndAnswers", JSON.stringify(savedQuestionsAndAnswers));
            setItems(Object.entries(savedQuestionsAndAnswers).map(([question, answer]) => ({ question, answer })));
            fs.unwatchFile(filePath);
            resolve(answer);
          } catch (err: unknown) {
            console.error('An error occurred while reading the file:', err);
            reject(err);
          }
        }
      });
    });
  }

  useEffect(() => {
    (async () => {
      await send_question(question);
      setHasNewAnswer(false);
    })();
  }, [question]);
  
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
  
    const checkAnswer = async () => {
      if (!hasNewAnswer) {
        try {
          const newAnswer = await get_answer(question, false);
          console.log('Obtained answer:', newAnswer);
          setAnswer(newAnswer);
          setIsLoading(false);
        } catch (err) {
          console.error('An error occurred while getting the answer:', err);
        }
      }
      timeoutId = setTimeout(checkAnswer, 1000);
    };
  
    checkAnswer();
  
    return () => {
      clearTimeout(timeoutId);
    };
  }, [hasNewAnswer]);

  return (
    <Detail
      markdown={answer || ""}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {answer && (
            <Action.CopyToClipboard
              title="Copy to Clipboard"
              shortcut={{ modifiers: ["shift"], key: "enter" }}
              content={`${question}\n\n${answer}`}
              />
          )}
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [cmd, setCmd] = useState("");
  const [items, setItems] = useState<{ question: string; answer: string }[]>([]);
  const [filteredItems, setFilteredItems] = useState<{ question: string; answer: string }[]>([]);
  const { pop } = useNavigation();

  const deleteItem = async (itemQuestion: string) => {
    const savedQuestionsAndAnswers = JSON.parse(await LocalStorage.getItem<LocalStorage.Value>("questionsAndAnswers") as string || "{}") as { [question: string]: string };
    delete savedQuestionsAndAnswers[itemQuestion];
    await LocalStorage.setItem("questionsAndAnswers", JSON.stringify(savedQuestionsAndAnswers));
    const reversedItems = Object.entries(savedQuestionsAndAnswers).map(([question, answer]) => ({ question, answer })).reverse();
    setItems(reversedItems);
    showToast(Toast.Style.Success, "Delete Successfully");
    pop();
  }

  useEffect(() => {
    const newFilteredItems = items.filter(item => item.question.includes(cmd)).sort((a, b) => a.question.localeCompare(b.question));
    setFilteredItems(newFilteredItems);
  }, [cmd, items]);


  useEffect(() => {
    (async () => {
      const savedQuestionsAndAnswers = JSON.parse(await LocalStorage.getItem<LocalStorage.Value>("questionsAndAnswers") as string || "{}") as { [question: string]: string };
      const reversedItems = Object.entries(savedQuestionsAndAnswers).map(([question, answer]) => ({ question, answer })).reverse();
      setItems(reversedItems);
    })();
  }, []);

  return (
    <List
      onSearchTextChange={setCmd}
      navigationTitle="What is your perplexity?"
      searchBarPlaceholder="Enter your question here..."
    >
      <List.Section title="New Question">
        {cmd && (
          <List.Item
            title={cmd}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Submit"
                  target={<AnswerView question={cmd} setItems={setItems} />}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Section title="Question History">
        {filteredItems.map((item, index) => (
          <List.Item
            key={index}
            title={item.question}
            accessories={[{ text: "View Details" }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  target={
                    <Detail 
                      markdown={`# ${item.question}\n\n${item.answer}`} 
                      actions={
                        <ActionPanel>
                          <Action
                            title="Back"
                            icon={{ source: Icon.ArrowLeft, tintColor: Color.PrimaryText }}
                            onAction={pop}
                          />
                          <Action.CopyToClipboard
                            title="Copy"
                            shortcut={{ modifiers: ["shift"], key: "enter" }}
                            content={`${item.question}\n\n${item.answer}`}
                          />
                          <Action
                            title="Delete"
                            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                            icon={{ source: Icon.Trash, tintColor: Color.Red }}
                            onAction={() => deleteItem(item.question)}
                          />
                        </ActionPanel>
                      }
                    />
                  }
                />
                <Action
                  title="Delete"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                  onAction={async () => {
                    const savedQuestionsAndAnswers = JSON.parse(await LocalStorage.getItem<LocalStorage.Value>("questionsAndAnswers") as string || "{}") as { [question: string]: string };
                    delete savedQuestionsAndAnswers[item.question];
                    await LocalStorage.setItem("questionsAndAnswers", JSON.stringify(savedQuestionsAndAnswers));
                    const reversedItems = Object.entries(savedQuestionsAndAnswers).map(([question, answer]) => ({ question, answer })).reverse();
                    setItems(reversedItems);
                    showToast(Toast.Style.Success, "Delete Successfully");
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}