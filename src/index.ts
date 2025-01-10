import app from "./App";

const port: string | undefined = process.env.PORT;

if (!port) {
  console.error("PORT environment variable is not defined.");
  process.exit(1);
}

app.listen(parseInt(port), () => {
  console.log(`Backend started at port: ${port}.`);
});
