"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { processRawData } from "@/lib/data-processing";
import { type Delivery } from "@/lib/definitions";
import { useToast } from "@/hooks/use-toast";

interface FileUploaderProps {
  onDataUploaded: (data: Delivery[], error?: string) => void;
  setLoading: (loading: boolean) => void;
}

export function FileUploader({ onDataUploaded, setLoading }: FileUploaderProps) {
  const { toast } = useToast();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setLoading(true);
      if (acceptedFiles.length === 0) {
        onDataUploaded([], "No files were dropped or selected.");
        return;
      }

      const file = acceptedFiles[0];

      if (!file.name.endsWith(".xlsx")) {
        onDataUploaded([], "Invalid file type. Please upload a .xlsx file.");
        toast({
          title: "Invalid File Type",
          description: "Please upload a .xlsx file.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const reader = new FileReader();
      reader.onabort = () => {
        onDataUploaded([], "File reading was aborted.");
        setLoading(false);
      }
      reader.onerror = () => {
        onDataUploaded([], "File reading has failed.");
        setLoading(false);
      }
      reader.onload = () => {
        try {
          const binaryStr = reader.result;
          const workbook = XLSX.read(binaryStr, { type: "binary", cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          if (jsonData.length === 0) {
            throw new Error("The uploaded file is empty or in an incorrect format.");
          }

          const processedData = processRawData(jsonData);
          onDataUploaded(processedData);
          toast({
            title: "File Uploaded Successfully",
            description: `${processedData.length} records have been processed.`,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during file processing.";
          onDataUploaded([], errorMessage);
          toast({
            title: "Processing Error",
            description: errorMessage,
            variant: "destructive",
          });
          setLoading(false);
        }
      };
      reader.readAsBinaryString(file);
    },
    [onDataUploaded, setLoading, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: false,
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`flex justify-center w-full px-6 py-12 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          <UploadCloud className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="mt-4 text-lg font-semibold">
            {isDragActive ? "Drop the file here..." : "Drag & drop your XLSX file here"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">or click to select a file</p>
          <p className="mt-4 text-xs text-muted-foreground flex items-center justify-center gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Supported format: .xlsx
          </p>
        </div>
      </div>
    </div>
  );
}
