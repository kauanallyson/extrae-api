import { env } from "@/config";
import { app } from "./app";

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`Express is running at http://0.0.0.0:${env.PORT}`);
});
