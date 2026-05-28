import { ArrowRightIcon, FlameIcon, RefreshCwIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const workflowSteps = [
	{
		title: "Initialize",
		description: "Scaffolded shadcn for Vite with the base primitive layer.",
	},
	{
		title: "Style",
		description: "Applied the nova preset tokens and typography into the shared CSS entry.",
	},
	{
		title: "Compose",
		description: "Wired UI source files into the app through local components and aliases.",
	},
];

const stackItems = ["Electrobun", "React 18", "Tailwind CSS", "shadcn/base"];

function App() {
	const [count, setCount] = useState(0);

	return (
		<div className="theme min-h-screen bg-background">
			<div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-10 lg:px-10">
				<section className="relative overflow-hidden rounded-[2rem] border bg-card text-card-foreground shadow-sm">
					<div className="absolute inset-0 bg-gradient-to-br from-muted/80 via-background to-background" />
					<div className="absolute -top-24 left-0 size-72 rounded-full bg-primary/5 blur-3xl" />
					<div className="relative flex flex-col gap-8 p-8 lg:flex-row lg:items-end lg:justify-between lg:p-10">
						<div className="flex max-w-3xl flex-col gap-5">
							<Badge variant="secondary">
								<SparklesIcon data-icon="inline-start" />
								Base UI + Nova
							</Badge>
							<div className="flex flex-col gap-3">
								<h1 className="font-heading text-4xl leading-tight font-medium tracking-tight lg:text-6xl">
									shadcn has been integrated into this Electrobun app.
								</h1>
								<p className="max-w-2xl text-base leading-7 text-muted-foreground lg:text-lg">
									The project now uses the <code>base-nova</code> setup, local UI
									source files, and semantic design tokens from the shadcn preset.
								</p>
							</div>
							<div className="flex flex-wrap gap-3">
								<Button onClick={() => setCount((value) => value + 1)}>
									<FlameIcon data-icon="inline-start" />
									Count: {count}
								</Button>
								<Button onClick={() => setCount(0)} variant="outline">
									<RefreshCwIcon data-icon="inline-start" />
									Reset
								</Button>
							</div>
						</div>

						<Card className="w-full max-w-sm border bg-background/90 backdrop-blur">
							<CardHeader>
								<CardTitle>Integration status</CardTitle>
								<CardDescription>
									Core shadcn pieces are installed and ready for further component
									expansion.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col gap-4">
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Preset</span>
									<Badge variant="outline">nova</Badge>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Primitive layer</span>
									<Badge variant="outline">base ui</Badge>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Alias</span>
									<code className="rounded bg-muted px-2 py-1 text-xs">@/...</code>
								</div>
							</CardContent>
							<CardFooter>
								<Button variant="ghost">
									Next: add more components
									<ArrowRightIcon data-icon="inline-end" />
								</Button>
							</CardFooter>
						</Card>
					</div>
				</section>

				<section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
					<Card>
						<CardHeader>
							<CardTitle>What changed</CardTitle>
							<CardDescription>
								The app was moved from raw Tailwind markup to shadcn-managed UI
								source files.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							{workflowSteps.map((step, index) => (
								<div key={step.title} className="flex flex-col gap-4">
									<div className="flex items-start gap-4">
										<Badge variant="secondary">{index + 1}</Badge>
										<div className="flex flex-col gap-1">
											<h3 className="font-medium">{step.title}</h3>
											<p className="text-sm leading-6 text-muted-foreground">
												{step.description}
											</p>
										</div>
									</div>
									{index < workflowSteps.length - 1 ? <Separator /> : null}
								</div>
							))}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Current stack</CardTitle>
							<CardDescription>
								These packages are now part of the UI layer and ready to use in
								new screens.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid grid-cols-2 gap-3">
							{stackItems.map((item) => (
								<div
									key={item}
									className="rounded-xl border bg-muted/50 px-4 py-3 text-sm font-medium"
								>
									{item}
								</div>
							))}
						</CardContent>
						<CardFooter className="justify-between">
							<span className="text-sm text-muted-foreground">
								Edit <code>src/mainview/App.tsx</code> to extend this screen.
							</span>
						</CardFooter>
					</Card>
				</section>
			</div>
		</div>
	);
}

export default App;
